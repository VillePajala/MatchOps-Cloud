import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountDeletionModal } from '../AccountDeletionModal';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import { useAuth } from '@/context/AuthContext';

// Mock dependencies
jest.mock('@/hooks/useAccountDeletion');
jest.mock('@/context/AuthContext');

const mockUseAccountDeletion = useAccountDeletion as jest.MockedFunction<typeof useAccountDeletion>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AccountDeletionModal', () => {
  const mockOnClose = jest.fn();
  const mockRequest = jest.fn();
  const mockGetState = jest.fn();
  const mockCancel = jest.fn();
  const mockConfirm = jest.fn();
  const mockCheckCanConfirm = jest.fn();
  const user = userEvent.setup();

  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup auth context mock
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });

    // Setup account deletion hook mock
    mockUseAccountDeletion.mockReturnValue({
      request: mockRequest,
      getState: mockGetState,
      cancel: mockCancel,
      confirm: mockConfirm,
      checkCanConfirm: mockCheckCanConfirm,
    });
  });

  describe('Modal Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<AccountDeletionModal isOpen={false} onClose={mockOnClose} />);
      
      expect(screen.queryByText(/delete account/i)).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText(/delete account/i)).toBeInTheDocument();
    });

    it('should show warning about permanent deletion', () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText(/permanently remove all your data/i)).toBeInTheDocument();
    });
  });

  describe('Account Deletion Request Flow', () => {
    it('should successfully request account deletion', async () => {
      // Arrange
      mockRequest.mockResolvedValue({ success: true });
      mockGetState.mockResolvedValue({
        scheduledDate: '2025-09-01',
        daysRemaining: 30,
      });
      mockCheckCanConfirm.mockResolvedValue({ canConfirm: false });

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const passwordInput = screen.getByLabelText(/confirm password/i);
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Act
      await user.click(confirmCheckbox);
      await user.type(passwordInput, 'testpassword');
      await user.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith('test-user-123', false);
      });

      await waitFor(() => {
        expect(screen.getByText(/deletion scheduled for/i)).toBeInTheDocument();
        expect(screen.getByText(/2025-09-01/i)).toBeInTheDocument();
        expect(screen.getByText(/30/i)).toBeInTheDocument();
      });
    });

    it('should handle immediate deletion mode', async () => {
      // Arrange
      mockRequest.mockResolvedValue({ success: true });
      mockGetState.mockResolvedValue({
        scheduledDate: new Date().toISOString(),
        daysRemaining: 0,
      });
      mockCheckCanConfirm.mockResolvedValue({ canConfirm: true });

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const immediateCheckbox = screen.getByRole('checkbox', { name: /delete immediately/i });
      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const passwordInput = screen.getByLabelText(/confirm password/i);

      // Act
      await user.click(immediateCheckbox);
      await user.click(confirmCheckbox);
      await user.type(passwordInput, 'testpassword');
      
      // Wait for button text to update
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete now/i })).toBeInTheDocument();
      });
      
      const deleteButton = screen.getByRole('button', { name: /delete now/i });
      await user.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith('test-user-123', true);
      });
    });

    it('should handle deletion request errors', async () => {
      // Arrange
      const errorMessage = 'Account deletion failed due to server error';
      mockRequest.mockResolvedValue({ 
        success: false, 
        errors: [errorMessage] 
      });

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const passwordInput = screen.getByLabelText(/confirm password/i);
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Act
      await user.click(confirmCheckbox);
      await user.type(passwordInput, 'testpassword');
      await user.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should handle network errors during deletion request', async () => {
      // Arrange
      mockRequest.mockRejectedValue(new Error('Network connection failed'));

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const passwordInput = screen.getByLabelText(/confirm password/i);
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Act
      await user.click(confirmCheckbox);
      await user.type(passwordInput, 'testpassword');
      await user.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/network connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should require confirmation checkbox to be checked', async () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Act - Try to submit without checking confirmation
      await user.click(deleteButton);

      // Assert - Should not call deletion request
      expect(mockRequest).not.toHaveBeenCalled();
      expect(deleteButton).toBeDisabled();
    });

    it('should enable delete button when confirmation is checked and password entered', async () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const passwordInput = screen.getByLabelText(/confirm password/i);
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Initially disabled
      expect(deleteButton).toBeDisabled();

      // Act
      await user.click(confirmCheckbox);
      await user.type(passwordInput, 'testpassword');

      // Assert
      expect(deleteButton).toBeEnabled();
    });

    it('should not function without authenticated user', async () => {
      // Arrange - No authenticated user
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const passwordInput = screen.getByLabelText(/confirm password/i);
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Act
      await user.click(confirmCheckbox);
      await user.type(passwordInput, 'testpassword');
      await user.click(deleteButton);

      // Assert - Should not call deletion request without user
      expect(mockRequest).not.toHaveBeenCalled();
    });
  });

  describe('Cancellation Flow', () => {
    it('should allow cancelling pending deletion', async () => {
      // Arrange - Set up pending deletion state
      mockRequest.mockResolvedValue({ success: true });
      mockGetState.mockResolvedValue({
        scheduledDate: '2025-09-01',
        daysRemaining: 25,
      });
      mockCheckCanConfirm.mockResolvedValue({ canConfirm: false });
      mockCancel.mockResolvedValue(true);

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      // First trigger deletion request to show pending state
      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const passwordInput = screen.getByLabelText(/confirm password/i);
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      await user.click(confirmCheckbox);
      await user.type(passwordInput, 'testpassword');
      await user.click(deleteButton);

      // Wait for pending state to appear
      await waitFor(() => {
        expect(screen.getByText(/deletion scheduled for/i)).toBeInTheDocument();
      });

      // Now find and click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel deletion request/i });
      await user.click(cancelButton);

      // Assert
      await waitFor(() => {
        expect(mockCancel).toHaveBeenCalled();
      });
    });

    it('should handle cancellation errors', async () => {
      // Arrange - Set up pending deletion state first
      mockRequest.mockResolvedValue({ success: true });
      mockGetState.mockResolvedValue({
        scheduledDate: '2025-09-01',
        daysRemaining: 25,
      });
      mockCheckCanConfirm.mockResolvedValue({ canConfirm: false });
      mockCancel.mockRejectedValue(new Error('Unable to cancel deletion'));

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      // First trigger deletion request to show pending state
      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const passwordInput = screen.getByLabelText(/confirm password/i);
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      await user.click(confirmCheckbox);
      await user.type(passwordInput, 'testpassword');
      await user.click(deleteButton);

      // Wait for pending state to appear
      await waitFor(() => {
        expect(screen.getByText(/deletion scheduled for/i)).toBeInTheDocument();
      });

      // Now find and click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel deletion request/i });
      await user.click(cancelButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/unable to cancel deletion/i)).toBeInTheDocument();
      });
    });
  });

  describe('Final Confirmation Flow', () => {
    it('should show finalize deletion button when grace period expires', async () => {
      // Arrange - Set up expired grace period state
      mockRequest.mockResolvedValue({ success: true });
      mockGetState.mockResolvedValue({
        scheduledDate: '2025-09-01',
        daysRemaining: 0,
      });
      mockCheckCanConfirm.mockResolvedValue({ canConfirm: true });

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      // First trigger deletion request to show pending state
      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const passwordInput = screen.getByLabelText(/confirm password/i);
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      await user.click(confirmCheckbox);
      await user.type(passwordInput, 'testpassword');
      await user.click(deleteButton);

      // Assert - Should show finalize deletion button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /finalize deletion/i })).toBeInTheDocument();
        expect(screen.getByText(/grace period has expired/i)).toBeInTheDocument();
      });
    });

    it('should execute final confirmation when finalize button clicked', async () => {
      // Arrange - Set up expired grace period state
      mockRequest.mockResolvedValue({ success: true });
      mockGetState.mockResolvedValue({
        scheduledDate: '2025-09-01',
        daysRemaining: 0,
      });
      mockCheckCanConfirm.mockResolvedValue({ canConfirm: true });
      mockConfirm.mockResolvedValue({ success: true });

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      // First trigger deletion request to show pending state
      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const passwordInput = screen.getByLabelText(/confirm password/i);
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      await user.click(confirmCheckbox);
      await user.type(passwordInput, 'testpassword');
      await user.click(deleteButton);

      // Wait for finalize button to appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /finalize deletion/i })).toBeInTheDocument();
      });

      // Act - Click finalize deletion
      const finalizeButton = screen.getByRole('button', { name: /finalize deletion/i });
      await user.click(finalizeButton);

      // Assert
      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalledWith('test-user-123');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during deletion request', async () => {
      // Arrange
      mockRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const passwordInput = screen.getByLabelText(/confirm password/i);
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Act
      await user.click(confirmCheckbox);
      await user.type(passwordInput, 'testpassword');
      await user.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
        expect(deleteButton).toBeDisabled();
      });
    });

    it('should disable submit button during submission', async () => {
      // Arrange
      mockRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i });
      const passwordInput = screen.getByLabelText(/confirm password/i);
      const deleteButton = screen.getByRole('button', { name: /request deletion/i });

      // Act
      await user.click(confirmCheckbox);
      await user.type(passwordInput, 'testpassword');
      await user.click(deleteButton);

      // Assert - Only the button should be disabled
      await waitFor(() => {
        expect(deleteButton).toBeDisabled();
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });
    });
  });

  describe('Modal Controls', () => {
    it('should close modal when close button is clicked', async () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });

      // Act
      await user.click(closeButton);

      // Assert
      expect(mockOnClose).toHaveBeenCalled();
    });

  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      // Check for modal role
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Check for proper labeling - the modal is labeled by the title
      expect(screen.getByText('Delete Account')).toBeInTheDocument();
    });

    it('should have modal accessibility attributes', () => {
      render(<AccountDeletionModal isOpen={true} onClose={mockOnClose} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-labelledby', 'delete-title');
    });
  });
});