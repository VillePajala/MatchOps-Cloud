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
  phase: 'no-players' as const,
  hasPlayers: false,
  onCreateRoster: jest.fn(),
  onCreateGame: jest.fn(),
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

  describe('Phase 1: No Players State', () => {
    it('renders phase 1 content when phase is no-players', () => {
      render(<FirstGameOnboardingOverlay {...defaultProps} phase="no-players" />);
      
      expect(screen.getByText('Valmis aloittamaan?')).toBeInTheDocument();
      expect(screen.getByText('Lisää ensin pelaajia, jotta voit luoda ensimmäisen joukkuesi ja ottelusi.')).toBeInTheDocument();
      expect(screen.getByText('Luo kokoonpano')).toBeInTheDocument();
    });

    it('calls onCreateRoster and onDismiss when create roster button is clicked', async () => {
      const user = userEvent.setup();
      render(<FirstGameOnboardingOverlay {...defaultProps} phase="no-players" />);
      
      const createButton = screen.getByText('Luo kokoonpano');
      await user.click(createButton);
      
      expect(defaultProps.onCreateRoster).toHaveBeenCalledTimes(1);
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Phase 2: Has Players State', () => {
    const phase2Props = { ...defaultProps, phase: 'has-players' as const, hasPlayers: true };

    it('renders phase 2 content when phase is has-players', () => {
      render(<FirstGameOnboardingOverlay {...phase2Props} />);
      
      expect(screen.getByText('Kaikki valmista ensimmäiseen otteluun!')).toBeInTheDocument();
      expect(screen.getByText('Haluatseesi voit luoda ensimmäisen joukkuesi, turnauksei tai kautesi.')).toBeInTheDocument();
      expect(screen.getByText('Luo ensimmäinen ottelu')).toBeInTheDocument();
      expect(screen.getByText('Hallinnoi joukkueita')).toBeInTheDocument();
      expect(screen.getByText('Luo ensin kausi/turnaus')).toBeInTheDocument();
    });

    it('calls onCreateGame and onDismiss when create first match button is clicked', async () => {
      const user = userEvent.setup();
      render(<FirstGameOnboardingOverlay {...phase2Props} />);
      
      const createButton = screen.getByText('Luo ensimmäinen ottelu');
      await user.click(createButton);
      
      expect(defaultProps.onCreateGame).toHaveBeenCalledTimes(1);
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onManageTeams and onDismiss when manage teams button is clicked', async () => {
      const user = userEvent.setup();
      const onManageTeams = jest.fn();
      render(<FirstGameOnboardingOverlay {...phase2Props} onManageTeams={onManageTeams} />);
      
      const manageButton = screen.getByText('Hallinnoi joukkueita');
      await user.click(manageButton);
      
      expect(onManageTeams).toHaveBeenCalledTimes(1);
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onManageSeasons and onDismiss when create season/tournament button is clicked', async () => {
      const user = userEvent.setup();
      const onManageSeasons = jest.fn();
      render(<FirstGameOnboardingOverlay {...phase2Props} onManageSeasons={onManageSeasons} />);
      
      const seasonButton = screen.getByText('Luo ensin kausi/turnaus');
      await user.click(seasonButton);
      
      expect(onManageSeasons).toHaveBeenCalledTimes(1);
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Phase 3: Tutorial State', () => {
    const tutorialProps = { 
      ...defaultProps, 
      phase: 'tutorial' as const,
      tutorialStep: 0,
      onTutorialNext: jest.fn(),
      onTutorialPrev: jest.fn(),
      onTutorialClose: jest.fn()
    };

    it('renders tutorial content when phase is tutorial', () => {
      render(<FirstGameOnboardingOverlay {...tutorialProps} />);
      
      expect(screen.getByText('Tervetuloa ensimmäiseen otteluusi!')).toBeInTheDocument();
      expect(screen.getByText('Käydään nopeastit läpi perustoimimat')).toBeInTheDocument();
      expect(screen.getByText('Pelaajien valinta (yläpalkki)')).toBeInTheDocument();
      expect(screen.getByText('Takaisin')).toBeInTheDocument();
      expect(screen.getByText('Seuraava')).toBeInTheDocument();
    });

    it('shows step indicators in tutorial phase', () => {
      render(<FirstGameOnboardingOverlay {...tutorialProps} />);
      
      // Should have 7 step indicators (dots)
      const indicators = screen.getAllByRole('generic').filter(el => 
        el.className.includes('w-2 h-2 rounded-full')
      );
      expect(indicators).toHaveLength(7);
    });

    it('calls onTutorialNext when next button is clicked', async () => {
      const user = userEvent.setup();
      render(<FirstGameOnboardingOverlay {...tutorialProps} />);
      
      const nextButton = screen.getByText('Seuraava');
      await user.click(nextButton);
      
      expect(tutorialProps.onTutorialNext).toHaveBeenCalledTimes(1);
    });

    it('calls onTutorialPrev when back button is clicked', async () => {
      const user = userEvent.setup();
      const propsWithStep = { ...tutorialProps, tutorialStep: 2 };
      render(<FirstGameOnboardingOverlay {...propsWithStep} />);
      
      const backButton = screen.getByText('Takaisin');
      await user.click(backButton);
      
      expect(tutorialProps.onTutorialPrev).toHaveBeenCalledTimes(1);
    });

    it('shows close button on last tutorial step', () => {
      const propsWithLastStep = { ...tutorialProps, tutorialStep: 6 };
      render(<FirstGameOnboardingOverlay {...propsWithLastStep} />);
      
      expect(screen.getByText('Valmis!')).toBeInTheDocument();
    });

    it('does not show close button (X) in tutorial phase', () => {
      render(<FirstGameOnboardingOverlay {...tutorialProps} />);
      
      expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('calls onDismiss when close button is clicked (non-tutorial phases)', async () => {
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
      
      const title = screen.getByText('Valmis aloittamaan?');
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
      render(<FirstGameOnboardingOverlay {...defaultProps} phase="no-players" />);
      
      // Get focusable elements
      const closeButton = screen.getByLabelText('Close');
      const createButton = screen.getByText('Luo kokoonpano');
      
      // Should focus first element initially
      await waitFor(() => {
        expect(closeButton).toHaveFocus();
      });
      
      // Tab should move to next element
      await user.keyboard('{Tab}');
      expect(createButton).toHaveFocus();
      
      // Tab should cycle back to first element
      await user.keyboard('{Tab}');
      expect(closeButton).toHaveFocus();
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
      render(<FirstGameOnboardingOverlay {...defaultProps} phase="no-players" />);
      
      const heading = screen.getByText('Valmis aloittamaan?');
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
    it('uses phase 1 translation keys with fallbacks', () => {
      render(<FirstGameOnboardingOverlay {...defaultProps} phase="no-players" />);
      
      expect(mockT).toHaveBeenCalledWith('firstGame.phase1.title', 'Valmis aloittamaan?');
      expect(mockT).toHaveBeenCalledWith('firstGame.phase1.message', 'Lisää ensin pelaajia, jotta voit luoda ensimmäisen joukkuesi ja ottelusi.');
      expect(mockT).toHaveBeenCalledWith('firstGame.phase1.createRoster', 'Luo kokoonpano');
    });

    it('uses phase 2 translation keys', () => {
      render(<FirstGameOnboardingOverlay {...defaultProps} phase="has-players" hasPlayers={true} />);
      
      expect(mockT).toHaveBeenCalledWith('firstGame.phase2.title', 'Kaikki valmista ensimmäiseen otteluun!');
      expect(mockT).toHaveBeenCalledWith('firstGame.phase2.message', 'Haluatseesi voit luoda ensimmäisen joukkuesi, turnauksei tai kautesi.');
      expect(mockT).toHaveBeenCalledWith('firstGame.phase2.createFirstMatch', 'Luo ensimmäinen ottelu');
    });

    it('uses tutorial translation keys', () => {
      const tutorialProps = { 
        ...defaultProps, 
        phase: 'tutorial' as const,
        onTutorialNext: jest.fn(),
        onTutorialPrev: jest.fn(),
        onTutorialClose: jest.fn()
      };
      render(<FirstGameOnboardingOverlay {...tutorialProps} />);
      
      expect(mockT).toHaveBeenCalledWith('firstGame.tutorial.title', 'Tervetuloa ensimmäiseen otteluusi!');
      expect(mockT).toHaveBeenCalledWith('firstGame.tutorial.subtitle', 'Käydään nopeastit läpi perustoimimat');
      expect(mockT).toHaveBeenCalledWith('firstGame.tutorial.playerSelection', 'Pelaajien valinta (yläpalkki)');
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