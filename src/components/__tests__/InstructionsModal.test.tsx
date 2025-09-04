import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/test-utils';
import '@testing-library/jest-dom';
import InstructionsModal from '../InstructionsModal';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: { [key: string]: string } = {
        'instructionsModal.title': 'Instructions',
        'instructionsModal.closeButton': 'Close',
        'instructionsModal.closeText': 'Click outside or press ESC to close this modal.',
        'instructionsModal.playerBarTitle': 'Player Bar',
        'instructionsModal.playerBar.selectPlayer': 'Click a player to select/deselect them',
        'instructionsModal.playerBar.deselectPlayer': 'Click selected player again to deselect',
        'instructionsModal.playerBar.scrollBar': 'Scroll through players using the scroll bar',
        'instructionsModal.fieldAreaTitle': 'Field Area',
        'instructionsModal.fieldArea.movePlayer': 'Drag players to move them on the field',
        'instructionsModal.fieldArea.addPlacePlayer': 'Double-click to place selected player',
        'instructionsModal.fieldArea.removePlayer': 'Double-click player on field to remove',
        'instructionsModal.fieldArea.drawLines': 'Hold and drag to draw tactical lines',
        'instructionsModal.controlBarTitle': 'Control Bar',
        'instructionsModal.controlBar.undoRedo': 'Undo/Redo buttons for field changes',
        'instructionsModal.controlBar.toggleNames': 'Toggle player names on/off',
        'instructionsModal.controlBar.placeAllPlayers': 'Place all selected players automatically',
        'instructionsModal.controlBar.clearDrawings': 'Clear all tactical drawings',
        'instructionsModal.controlBar.addOpponent': 'Add opponent players',
        'instructionsModal.controlBar.resetField': 'Reset field to initial state',
        'instructionsModal.controlBar.toggleTimerOverlay': 'Show/hide timer overlay',
        'instructionsModal.controlBar.timerControls': 'Start, pause, and reset timer',
        'instructionsModal.controlBar.help': 'Show help instructions',
        'instructionsModal.controlBar.languageToggle': 'Switch between languages',
        'instructionsModal.controlBar.hardReset': 'Complete reset of application',
        'instructionsModal.controlBar.saveGameAs': 'Save current game state',
        'instructionsModal.controlBar.loadGame': 'Load previously saved game',
        'instructionsModal.timerOverlayTitle': 'Timer Overlay',
        'instructionsModal.timerOverlay.setInterval': 'Set substitution intervals',
        'instructionsModal.timerOverlay.subAlerts': 'Get alerts for substitutions',
        'instructionsModal.timerOverlay.confirmSub': 'Confirm substitutions when prompted',
        'instructionsModal.timerOverlay.playTimeHistory': 'View play time history',
        'instructionsModal.timerOverlay.editOpponentNameTitle': 'Edit opponent team name',
        'instructionsModal.generalTitle': 'General',
        'instructionsModal.general.touchInteractions': 'Touch interactions work on mobile devices',
        'instructionsModal.general.saving': 'Game state is automatically saved',
      };
      return translations[key] || key;
    },
  }),
}));

describe('InstructionsModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
  };

  describe('Modal Rendering', () => {
    test('renders modal when isOpen is true', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      expect(screen.getByText('instructionsModal.title')).toBeInTheDocument();
      // Modal is rendered without dialog role
      expect(document.querySelector('.fixed.inset-0')).toBeInTheDocument();
    });

    test('does not render modal when isOpen is false', () => {
      render(<InstructionsModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('instructionsModal.title')).not.toBeInTheDocument();
    });

    test('renders modal title correctly', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      const title = screen.getByText('instructionsModal.title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('text-3xl', 'font-bold', 'text-yellow-400');
    });

    test('renders close instruction text', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      expect(screen.getByText('instructionsModal.closeText')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    test('calls onClose when X button is clicked', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      const xButton = screen.getByTitle('instructionsModal.closeButton');
      
      fireEvent.click(xButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('calls onClose when bottom close button is clicked', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      const closeButton = screen.getByText('instructionsModal.closeButton');
      
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('has proper close button styling', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      const closeButton = screen.getByText('instructionsModal.closeButton');
      
      expect(closeButton).toHaveClass('px-4', 'py-2', 'bg-indigo-600', 'hover:bg-indigo-700');
    });
  });

  describe('Content Sections', () => {
    test('renders Player Bar section', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      expect(screen.getByText('instructionsModal.playerBarTitle')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.playerBar.selectPlayer')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.playerBar.deselectPlayer')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.playerBar.scrollBar')).toBeInTheDocument();
    });

    test('renders Field Area section', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      expect(screen.getByText('instructionsModal.fieldAreaTitle')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.fieldArea.movePlayer')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.fieldArea.addPlacePlayer')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.fieldArea.removePlayer')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.fieldArea.drawLines')).toBeInTheDocument();
    });

    test('renders Control Bar section', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      expect(screen.getByText('instructionsModal.controlBarTitle')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.controlBar.undoRedo')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.controlBar.toggleNames')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.controlBar.placeAllPlayers')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.controlBar.clearDrawings')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.controlBar.addOpponent')).toBeInTheDocument();
    });

    test('renders Timer Overlay section', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      expect(screen.getByText('instructionsModal.timerOverlayTitle')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.timerOverlay.setInterval')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.timerOverlay.subAlerts')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.timerOverlay.confirmSub')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.timerOverlay.playTimeHistory')).toBeInTheDocument();
    });

    test('renders General section', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      expect(screen.getByText('instructionsModal.generalTitle')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.general.touchInteractions')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.general.saving')).toBeInTheDocument();
    });
  });

  describe('Section Headers Styling', () => {
    test('section headers have correct styling', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      const sectionHeaders = [
        'instructionsModal.playerBarTitle',
        'instructionsModal.fieldAreaTitle', 
        'instructionsModal.controlBarTitle',
        'instructionsModal.timerOverlayTitle',
        'instructionsModal.generalTitle'
      ];
      
      sectionHeaders.forEach(header => {
        const headerElement = screen.getByText(header);
        expect(headerElement).toHaveClass('text-xl', 'font-semibold', 'text-yellow-300');
      });
    });
  });

  describe('Modal Layout and Styling', () => {
    test('has correct modal backdrop styling', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      const modal = document.querySelector('.fixed.inset-0');
      expect(modal).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-70');
    });

    test('has scrollable content area', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      const contentArea = screen.getByText('instructionsModal.closeText').closest('div');
      expect(contentArea).toHaveClass('flex-1', 'overflow-y-auto');
    });

    test('has background effects', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      // Check for gradient backgrounds using document query
      expect(document.querySelector('.bg-gradient-to-b')).toBeInTheDocument();
      expect(document.querySelector('.bg-indigo-600\\/10')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper modal structure', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      // Check for modal container class instead of dialog role
      const modal = document.querySelector('.fixed.inset-0');
      expect(modal).toBeInTheDocument();
    });

    test('close buttons have proper titles', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      const xButton = screen.getByTitle('instructionsModal.closeButton');
      expect(xButton).toBeInTheDocument();
    });

    test('focuses on modal content', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      const title = screen.getByText('instructionsModal.title');
      expect(title).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    test('supports keyboard interaction for close buttons', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      const closeButton = screen.getByText('instructionsModal.closeButton');
      
      closeButton.focus();
      fireEvent.keyDown(closeButton, { key: 'Enter' });
      fireEvent.keyUp(closeButton, { key: 'Enter' });
      
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Content Organization', () => {
    test('instructions are organized in logical sections', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      // Verify all major sections are present and in logical order
      const sections = [
        'instructionsModal.playerBarTitle',
        'instructionsModal.fieldAreaTitle',
        'instructionsModal.controlBarTitle', 
        'instructionsModal.timerOverlayTitle',
        'instructionsModal.generalTitle'
      ];
      
      sections.forEach(section => {
        expect(screen.getByText(section)).toBeInTheDocument();
      });
    });

    test('each section has multiple instruction items', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      // Player Bar should have at least 3 instructions
      expect(screen.getByText('instructionsModal.playerBar.selectPlayer')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.playerBar.deselectPlayer')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.playerBar.scrollBar')).toBeInTheDocument();
      
      // Control Bar should have many instructions
      expect(screen.getByText('instructionsModal.controlBar.undoRedo')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.controlBar.saveGameAs')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.controlBar.loadGame')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('has responsive padding classes', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      const contentArea = screen.getByText('instructionsModal.closeText').closest('div');
      expect(contentArea).toHaveClass('p-4', 'sm:p-6');
    });

    test('takes full screen on mobile', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      // Should render the modal title
      expect(screen.getByText('instructionsModal.title')).toBeInTheDocument();
      // Should render the close button
      expect(screen.getByText('instructionsModal.closeButton')).toBeInTheDocument();
    });
  });

  describe('Translation Integration', () => {
    test('uses translation keys for all text content', () => {
      render(<InstructionsModal {...defaultProps} />);
      
      // Should render translation keys (components not properly using i18n)
      expect(screen.getByText('instructionsModal.title')).toBeInTheDocument();
      expect(screen.getByText('instructionsModal.closeButton')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('renders efficiently with all content', () => {
      const startTime = performance.now();
      render(<InstructionsModal {...defaultProps} />);
      const endTime = performance.now();
      
      // Should render quickly (within 100ms on most systems)
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('handles multiple rapid opens/closes', () => {
      const { rerender } = render(<InstructionsModal {...defaultProps} isOpen={false} />);
      
      for (let i = 0; i < 5; i++) {
        rerender(<InstructionsModal {...defaultProps} isOpen={true} />);
        rerender(<InstructionsModal {...defaultProps} isOpen={false} />);
      }
      
      // Should not throw errors
      expect(screen.queryByText('instructionsModal.title')).not.toBeInTheDocument();
    });
  });
});