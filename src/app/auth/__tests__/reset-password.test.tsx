import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/lib/supabase');
jest.mock('@/utils/logger', () => ({ debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn(), }));
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Password Reset Page', () => {
  const mockPush = jest.fn();
  const mockSearchParams = new Map();
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockSearchParams.clear();
    
    // Setup router mock
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    });

    // Setup search params mock
    mockUseSearchParams.mockReturnValue({
      get: (key: string) => mockSearchParams.get(key) || null,
      has: (key: string) => mockSearchParams.has(key),
      getAll: () => [],
      keys: () => mockSearchParams.keys(),
      values: () => mockSearchParams.values(),
      entries: () => mockSearchParams.entries(),
      forEach: mockSearchParams.forEach.bind(mockSearchParams),
      toString: () => '',
    } as URLSearchParams);

    // Setup logger mocks
    mockLogger.debug = jest.fn();
    mockLogger.error = jest.fn();
    mockLogger.warn = jest.fn();
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/auth/reset-password',
        hash: '',
        search: '',
      },
      writable: true,
    });

    // Setup supabase auth mock
    mockSupabase.auth = {
      getSession: jest.fn(),
      verifyOtp: jest.fn(),
      updateUser: jest.fn(),
    } as any;
  });

  describe('Valid Reset Token Session', () => {
    it('should allow password reset with valid recovery session', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: '123',
          recovery_sent_at: new Date().toISOString()
        }
      };
      
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const ResetPasswordPage = (await import('../reset-password/page')).default;

      // Act
      render(<ResetPasswordPage />);

      // Assert - Should show password reset form for valid session
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Valid session found, allowing password reset');
    });

    it('should successfully update password with valid input', async () => {
      // Arrange
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: { user: { id: '123' } } },
        error: null
      });

      mockSupabase.auth.updateUser = jest.fn().mockResolvedValue({
        error: null,
        data: { user: { id: '123' } }
      });

      const ResetPasswordPage = (await import('../reset-password/page')).default;
      render(<ResetPasswordPage />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      // Act
      await user.type(newPasswordInput, 'newSecurePassword123!');
      await user.type(confirmPasswordInput, 'newSecurePassword123!');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
          password: 'newSecurePassword123!'
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument();
      });
    });
  });

  describe('Token Hash Verification (URL Fragment)', () => {
    it('should verify OTP token from URL hash parameters', async () => {
      // Arrange
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: null
      });

      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000/auth/reset-password#token=recovery_token_123&type=recovery&email=test%40example.com',
          hash: '#token=recovery_token_123&type=recovery&email=test%40example.com',
          search: '',
        },
        writable: true,
      });

      mockSupabase.auth.verifyOtp = jest.fn().mockResolvedValue({
        error: null,
        data: { user: { id: '123' } }
      });

      const ResetPasswordPage = (await import('../reset-password/page')).default;

      // Act
      render(<ResetPasswordPage />);

      // Assert
      await waitFor(() => {
        expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
          token: 'recovery_token_123',
          type: 'recovery',
          email: 'test@example.com'
        });
      });
    });

    it('should handle invalid or expired token hash', async () => {
      // Arrange
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: null
      });

      Object.defineProperty(window, 'location', {
        value: {
          hash: '#token=expired_token&type=recovery&email=test%40example.com',
        },
        writable: true,
      });

      const mockError = { message: 'Token has expired' };
      mockSupabase.auth.verifyOtp = jest.fn().mockResolvedValue({
        error: mockError,
        data: null
      });

      const ResetPasswordPage = (await import('../reset-password/page')).default;

      // Act
      render(<ResetPasswordPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/invalid or expired reset code/i)).toBeInTheDocument();
      });

      expect(mockLogger.error).toHaveBeenCalledWith('OTP verification error:', mockError);
    });
  });

  describe('Password Validation', () => {
    beforeEach(async () => {
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: { user: { id: '123' } } },
        error: null
      });
    });

    it('should validate password confirmation matching', async () => {
      // Arrange
      const ResetPasswordPage = (await import('../reset-password/page')).default;
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      // Act - Enter mismatched passwords
      await user.type(newPasswordInput, 'password123');
      await user.type(confirmPasswordInput, 'differentPassword');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it('should validate minimum password length', async () => {
      // Arrange
      const ResetPasswordPage = (await import('../reset-password/page')).default;
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      // Act - Enter passwords too short
      await user.type(newPasswordInput, '123');
      await user.type(confirmPasswordInput, '123');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/password must be at least/i)).toBeInTheDocument();
      });

      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it('should require both password fields to be filled', async () => {
      // Arrange
      const ResetPasswordPage = (await import('../reset-password/page')).default;
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /update password/i });

      // Act - Submit without entering passwords
      await user.click(submitButton);

      // Assert - Form should not submit
      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle password update API errors', async () => {
      // Arrange
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: { user: { id: '123' } } },
        error: null
      });

      const mockError = { message: 'Password update failed' };
      mockSupabase.auth.updateUser = jest.fn().mockResolvedValue({
        error: mockError,
        data: null
      });

      const ResetPasswordPage = (await import('../reset-password/page')).default;
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      // Act
      await user.type(newPasswordInput, 'validPassword123!');
      await user.type(confirmPasswordInput, 'validPassword123!');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/password update failed/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors during password update', async () => {
      // Arrange
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: { user: { id: '123' } } },
        error: null
      });

      mockSupabase.auth.updateUser = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      const ResetPasswordPage = (await import('../reset-password/page')).default;
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      // Act
      await user.type(newPasswordInput, 'validPassword123!');
      await user.type(confirmPasswordInput, 'validPassword123!');
      await user.click(submitButton);

      // Assert - Should handle the error gracefully
      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
      });
    });
  });

  describe('Missing or Invalid Reset Link', () => {
    it('should show error for missing reset token', async () => {
      // Arrange - No session and no hash parameters
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: null
      });

      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000/auth/reset-password',
          hash: '',
          search: '',
        },
        writable: true,
      });

      const ResetPasswordPage = (await import('../reset-password/page')).default;

      // Act
      render(<ResetPasswordPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /invalid reset link/i })).toBeInTheDocument();
      });

      expect(screen.getByText(/please request a new password reset/i)).toBeInTheDocument();
    });

    it('should provide link back to login page', async () => {
      // Arrange
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: null
      });

      const ResetPasswordPage = (await import('../reset-password/page')).default;

      // Act
      render(<ResetPasswordPage />);

      // Assert
      await waitFor(() => {
        const backToAppLink = screen.getByText(/back to app/i);
        expect(backToAppLink.closest('a')).toHaveAttribute('href', '/');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during password update', async () => {
      // Arrange
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: { user: { id: '123' } } },
        error: null
      });

      // Keep password update promise pending
      mockSupabase.auth.updateUser = jest.fn()
        .mockReturnValue(new Promise(() => {}));

      const ResetPasswordPage = (await import('../reset-password/page')).default;
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      // Act
      await user.type(newPasswordInput, 'validPassword123!');
      await user.type(confirmPasswordInput, 'validPassword123!');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/updating/i)).toBeInTheDocument();
      });

      expect(submitButton).toBeDisabled();
    });
  });
});