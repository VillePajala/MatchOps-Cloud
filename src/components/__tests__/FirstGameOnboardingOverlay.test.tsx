import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FirstGameOnboardingOverlay from '../FirstGameOnboardingOverlay';
import { useTranslation } from 'react-i18next';

// Mock dependencies
jest.mock('react-i18next');

const mockT = jest.fn((key: string, fallback: string) => fallback);

beforeEach(() => {
  jest.clearAllMocks();
  (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
});

// Mock props
const defaultProps = {
  hasPlayers: false,
  onSetupRoster: jest.fn(),
  onCreateNewGame: jest.fn(),
  onDismiss: jest.fn(),
  isVisible: true,
};

describe('FirstGameOnboardingOverlay', () => {
  describe('Visibility Control', () => {
    it('renders nothing when isVisible is false', () => {
      render(<FirstGameOnboardingOverlay {...defaultProps} isVisible={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders overlay when isVisible is true', () => {
      render(<FirstGameOnboardingOverlay {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('No Players State', () => {
    it('renders setup roster content when hasPlayers is false', () => {
      render(<FirstGameOnboardingOverlay {...defaultProps} hasPlayers={false} />);
      
      expect(screen.getByText('Ready to set up your team?')).toBeInTheDocument();
      expect(screen.getByText("Start by adding players to your roster. You'll need at least one player to create a game.")).toBeInTheDocument();
      expect(screen.getByText('Set Up Team Roster')).toBeInTheDocument();
    });

    it('calls onSetupRoster and onDismiss when setup roster button is clicked', async () => {
      const user = userEvent.setup();
      render(<FirstGameOnboardingOverlay {...defaultProps} hasPlayers={false} />);
      
      const setupButton = screen.getByText('Set Up Team Roster');
      await user.click(setupButton);
      
      expect(defaultProps.onSetupRoster).toHaveBeenCalledTimes(1);
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when skip button is clicked', async () => {
      const user = userEvent.setup();
      render(<FirstGameOnboardingOverlay {...defaultProps} hasPlayers={false} />);
      
      const skipButton = screen.getByText('Skip for now');
      await user.click(skipButton);
      
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Has Players State', () => {
    const propsWithPlayers = { ...defaultProps, hasPlayers: true };

    it('renders create game content when hasPlayers is true', () => {
      render(<FirstGameOnboardingOverlay {...propsWithPlayers} />);
      
      expect(screen.getByText('Ready to create your first match!')).toBeInTheDocument();
      expect(screen.getByText('You have players ready! Create your first match to start tracking game statistics and player performance.')).toBeInTheDocument();
      expect(screen.getByText('Create New Game')).toBeInTheDocument();
    });

    it('calls onCreateNewGame and onDismiss when create game button is clicked', async () => {
      const user = userEvent.setup();
      render(<FirstGameOnboardingOverlay {...propsWithPlayers} />);
      
      const createButton = screen.getByText('Create New Game');
      await user.click(createButton);
      
      expect(defaultProps.onCreateNewGame).toHaveBeenCalledTimes(1);
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when maybe later button is clicked', async () => {
      const user = userEvent.setup();
      render(<FirstGameOnboardingOverlay {...propsWithPlayers} />);
      
      const laterButton = screen.getByText('Maybe later');
      await user.click(laterButton);
      
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Close Functionality', () => {
    it('calls onDismiss when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<FirstGameOnboardingOverlay {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);
      
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(<FirstGameOnboardingOverlay {...defaultProps} />);
      
      const backdrop = screen.getByRole('dialog');
      await user.click(backdrop);
      
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not call onDismiss when modal content is clicked', async () => {
      const user = userEvent.setup();
      render(<FirstGameOnboardingOverlay {...defaultProps} />);
      
      const title = screen.getByText('Ready to set up your team?');
      await user.click(title);
      
      expect(defaultProps.onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('calls onDismiss when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<FirstGameOnboardingOverlay {...defaultProps} />);
      
      await user.keyboard('{Escape}');
      
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('manages focus trap with Tab key cycling', async () => {
      const user = userEvent.setup();
      render(<FirstGameOnboardingOverlay {...defaultProps} hasPlayers={false} />);
      
      // Get focusable elements
      const closeButton = screen.getByLabelText('Close');
      const setupButton = screen.getByText('Set Up Team Roster');
      const skipButton = screen.getByText('Skip for now');
      
      // Should focus first element initially
      await waitFor(() => {
        expect(closeButton).toHaveFocus();
      });
      
      // Tab should move to next element
      await user.keyboard('{Tab}');
      expect(setupButton).toHaveFocus();
      
      // Tab should move to last element
      await user.keyboard('{Tab}');
      expect(skipButton).toHaveFocus();
      
      // Tab should cycle back to first element
      await user.keyboard('{Tab}');
      expect(closeButton).toHaveFocus();
    });

    it('handles Shift+Tab for backwards navigation', async () => {
      const user = userEvent.setup();
      render(<FirstGameOnboardingOverlay {...defaultProps} hasPlayers={false} />);
      
      const closeButton = screen.getByLabelText('Close');
      const skipButton = screen.getByText('Skip for now');
      
      // Start from first element
      await waitFor(() => {
        expect(closeButton).toHaveFocus();
      });
      
      // Shift+Tab should cycle to last element
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(skipButton).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<FirstGameOnboardingOverlay {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'onboarding-title');
    });

    it('has proper heading structure', () => {
      render(<FirstGameOnboardingOverlay {...defaultProps} hasPlayers={false} />);
      
      const heading = screen.getByText('Ready to set up your team?');
      expect(heading).toHaveAttribute('id', 'onboarding-title');
      expect(heading.tagName).toBe('H2');
    });

    it('focuses first interactive element when visible', async () => {
      render(<FirstGameOnboardingOverlay {...defaultProps} />);
      
      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close');
        expect(closeButton).toHaveFocus();
      });
    });
  });

  describe('Translation Integration', () => {
    it('uses translation keys with fallbacks', () => {
      render(<FirstGameOnboardingOverlay {...defaultProps} hasPlayers={false} />);
      
      expect(mockT).toHaveBeenCalledWith('firstGame.titleNoPlayers', 'Ready to set up your team?');
      expect(mockT).toHaveBeenCalledWith('firstGame.messageNoPlayers', "Start by adding players to your roster. You'll need at least one player to create a game.");
      expect(mockT).toHaveBeenCalledWith('firstGame.setupRoster', 'Set Up Team Roster');
      expect(mockT).toHaveBeenCalledWith('firstGame.skipForNow', 'Skip for now');
    });

    it('uses correct translations for has players state', () => {
      render(<FirstGameOnboardingOverlay {...defaultProps} hasPlayers={true} />);
      
      expect(mockT).toHaveBeenCalledWith('firstGame.titleHasPlayers', 'Ready to create your first match!');
      expect(mockT).toHaveBeenCalledWith('firstGame.messageHasPlayers', 'You have players ready! Create your first match to start tracking game statistics and player performance.');
      expect(mockT).toHaveBeenCalledWith('firstGame.createNewGame', 'Create New Game');
      expect(mockT).toHaveBeenCalledWith('firstGame.maybeLater', 'Maybe later');
    });
  });

  describe('Memory Management', () => {
    it('cleans up event listeners when component unmounts', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<FirstGameOnboardingOverlay {...defaultProps} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('cleans up event listeners when isVisible changes to false', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { rerender } = render(<FirstGameOnboardingOverlay {...defaultProps} isVisible={true} />);
      
      // Change to invisible
      rerender(<FirstGameOnboardingOverlay {...defaultProps} isVisible={false} />);
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });
});