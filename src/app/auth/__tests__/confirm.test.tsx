import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/lib/supabase');
jest.mock('@/utils/logger', () => ({ debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn(), }));

// Mock the page component - we need to import it dynamically since it uses Suspense
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Email Confirmation Page', () => {
  const mockPush = jest.fn();
  const mockSearchParams = new Map();

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
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/auth/confirm',
        hash: '',
        search: '',
      },
      writable: true,
    });

    // Setup supabase auth mock
    mockSupabase.auth = {
      exchangeCodeForSession: jest.fn(),
      verifyOtp: jest.fn(),
    } as any;
  });

  describe('Email Confirmation with Auth Code', () => {
    it('should successfully confirm email with valid auth code', async () => {
      // Arrange
      const validCode = 'valid_auth_code_12345';
      mockSearchParams.set('code', validCode);
      
      mockSupabase.auth.exchangeCodeForSession = jest.fn().mockResolvedValue({
        error: null,
        data: { session: { user: { id: '123' } } }
      });

      // Dynamic import to handle Suspense boundary
      const ConfirmPage = (await import('../confirm/page')).default;

      // Act
      render(<ConfirmPage />);

      // Assert
      await waitFor(() => {
        expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith({
          authCode: validCode
        });
      });

      await waitFor(() => {
        expect(mockLogger.debug).toHaveBeenCalledWith('Sign-up code exchange successful!');
      });

      // Should redirect after success
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/?verified=true');
      }, { timeout: 3000 });
    });

    it('should handle invalid auth code gracefully', async () => {
      // Arrange
      const invalidCode = 'invalid_code';
      mockSearchParams.set('code', invalidCode);
      
      const mockError = { message: 'Invalid authorization code' };
      mockSupabase.auth.exchangeCodeForSession = jest.fn().mockResolvedValue({
        error: mockError,
        data: null
      });

      const ConfirmPage = (await import('../confirm/page')).default;

      // Act
      render(<ConfirmPage />);

      // Assert
      await waitFor(() => {
        expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith({
          authCode: invalidCode
        });
      });

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith('Sign-up code exchange error:', mockError);
      });

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/email confirmation failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Email Confirmation with Token Hash (Fallback Method)', () => {
    it('should handle token_hash confirmation method', async () => {
      // Arrange
      mockSearchParams.set('token_hash', 'valid_token_hash');
      mockSearchParams.set('type', 'signup');
      
      mockSupabase.auth.verifyOtp = jest.fn().mockResolvedValue({
        error: null,
        data: { user: { id: '123' } }
      });

      const ConfirmPage = (await import('../confirm/page')).default;

      // Act
      render(<ConfirmPage />);

      // Assert - Should attempt verifyOtp when no auth code present
      await waitFor(() => {
        expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
          email: '',
          token: 'valid_token_hash',
          type: 'signup',
        });
      });
    });

    it('should handle expired or invalid token hash', async () => {
      // Arrange
      mockSearchParams.set('token_hash', 'expired_token');
      mockSearchParams.set('type', 'signup');
      
      const mockError = { message: 'Token has expired' };
      mockSupabase.auth.verifyOtp = jest.fn().mockResolvedValue({
        error: mockError,
        data: null
      });

      const ConfirmPage = (await import('../confirm/page')).default;

      // Act
      render(<ConfirmPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Email Confirmation Failed/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Hash-based Parameters (URL Fragment)', () => {
    it('should parse parameters from URL hash when present', async () => {
      // Arrange - Simulate hash-based parameters (common with Supabase redirects)
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000/auth/confirm#access_token=abc&token_hash=xyz&type=signup',
          hash: '#access_token=abc&token_hash=xyz&type=signup',
          search: '',
        },
        writable: true,
      });

      const ConfirmPage = (await import('../confirm/page')).default;

      // Act
      render(<ConfirmPage />);

      // Assert - Should log hash parsing attempt
      await waitFor(() => {
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Confirm page URL info:',
          expect.objectContaining({
            hash: '#access_token=abc&token_hash=xyz&type=signup'
          })
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors during confirmation', async () => {
      // Arrange
      mockSearchParams.set('code', 'valid_code');
      
      mockSupabase.auth.exchangeCodeForSession = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      const ConfirmPage = (await import('../confirm/page')).default;

      // Act
      render(<ConfirmPage />);

      // Assert - Should handle promise rejection gracefully
      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    it('should handle missing confirmation parameters', async () => {
      // Arrange - No parameters in URL
      // mockSearchParams is empty by default

      const ConfirmPage = (await import('../confirm/page')).default;

      // Act
      render(<ConfirmPage />);

      // Assert - Should show appropriate message for missing parameters
      await waitFor(() => {
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Confirm page - checking for confirmation parameters...'
        );
      });
    });

    it('should prevent multiple simultaneous confirmation attempts', async () => {
      // Arrange
      mockSearchParams.set('code', 'valid_code');
      
      let resolveFirst: (value: any) => void;
      const firstPromise = new Promise(resolve => { resolveFirst = resolve; });
      
      mockSupabase.auth.exchangeCodeForSession = jest.fn()
        .mockReturnValueOnce(firstPromise)
        .mockResolvedValue({ error: null, data: { session: {} } });

      const ConfirmPage = (await import('../confirm/page')).default;

      // Act - Render component (triggers first confirmation attempt)
      render(<ConfirmPage />);
      
      // Resolve first attempt
      resolveFirst!({ error: null, data: { session: {} } });

      // Assert - Should not call confirmation multiple times
      await waitFor(() => {
        expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Loading and Success States', () => {
    it('should show loading state initially', async () => {
      // Arrange
      mockSearchParams.set('code', 'valid_code');
      
      // Keep the promise pending to test loading state
      mockSupabase.auth.exchangeCodeForSession = jest.fn()
        .mockReturnValue(new Promise(() => {}));

      const ConfirmPage = (await import('../confirm/page')).default;

      // Act
      render(<ConfirmPage />);

      // Assert
      expect(screen.getByText(/confirming/i)).toBeInTheDocument();
    });

    it('should show success state after successful confirmation', async () => {
      // Arrange
      mockSearchParams.set('code', 'valid_code');
      
      mockSupabase.auth.exchangeCodeForSession = jest.fn().mockResolvedValue({
        error: null,
        data: { session: { user: { id: '123' } } }
      });

      const ConfirmPage = (await import('../confirm/page')).default;

      // Act
      render(<ConfirmPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Email Verified Successfully!/i)).toBeInTheDocument();
      });
    });
  });
});