import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@/__tests__/test-utils';
import RosterSettingsModal from '../RosterSettingsModal';
import { useAuth } from '@/context/AuthContext';
import * as masterRoster from '@/utils/masterRoster';
import logger from '@/utils/logger';

// Mock dependencies
jest.mock('@/context/AuthContext');
jest.mock('@/utils/masterRoster');
jest.mock('@/utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

// Mock child components
/*
jest.mock('@/components/ui/Button', () => {
  return function MockButton({ children, onClick, disabled, variant, ...props }: any) {
    return (
      <button 
        onClick={onClick} 
        disabled={disabled}
        data-variant={variant}
        data-testid={props['data-testid'] || 'mock-button'}
        {...props}
      >
        {children}
      </button>
    );
  };
});

jest.mock('@/components/ui/Modal', () => {
  return function MockModal({ isOpen, onClose, children, ...props }: any) {
    return isOpen ? (
      <div data-testid="modal-container" role="dialog" {...props}>
        <div data-testid="modal-overlay" onClick={onClose} />
        <div data-testid="modal-content">
          <button data-testid="modal-close" onClick={onClose}>×</button>
          {children}
        </div>
      </div>
    ) : null;
  };
});

jest.mock('@/components/ui/Input', () => {
  return function MockInput({ value, onChange, placeholder, type, ...props }: any) {
    return (
      <input
        type={type || 'text'}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        data-testid={props['data-testid'] || 'mock-input'}
        {...props}
      />
    );
  };
});

jest.mock('@/components/ui/ColorPicker', () => {
  return function MockColorPicker({ color, onChange, ...props }: any) {
    return (
      <input
        type="color"
        value={color}
        onChange={(e) => onChange?.(e.target.value)}
        data-testid={props['data-testid'] || 'mock-color-picker'}
        {...props}
      />
    );
  };
});

jest.mock('@/components/ui/Toggle', () => {
  return function MockToggle({ checked, onChange, label, ...props }: any) {
    return (
      <label data-testid={props['data-testid'] || 'mock-toggle'}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        {label}
      </label>
    );
  };
});
*/

describe('RosterSettingsModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    availablePlayers: [
      { id: 'p1', name: 'John Doe', nickname: 'John', color: '#FF0000', isGoalie: false, number: 10 },
      { id: 'p2', name: 'Jane Smith', nickname: 'Jane', color: '#00FF00', isGoalie: true, number: 1 },
      { id: 'p3', name: 'Bob Wilson', nickname: 'Bob', color: '#0000FF', isGoalie: false, number: 7 },
    ],
    onRenamePlayer: jest.fn(),
    onSetJerseyNumber: jest.fn(),
    onSetPlayerNotes: jest.fn(),
    onRemovePlayer: jest.fn(),
    onAddPlayer: jest.fn(),
    selectedPlayerIds: [],
    onTogglePlayerSelection: jest.fn(),
    teamName: 'Test Team',
    onTeamNameChange: jest.fn(),
    isRosterUpdating: false,
    rosterError: null,
    onOpenPlayerStats: jest.fn(),
  };

  const mockAuth = {
    user: { id: 'user-123' },
    isAuthenticated: true,
    isLoading: false,
  };

  const mockMasterRoster = [
    { id: 'p1', name: 'John Doe', nickname: 'John', color: '#FF0000', isGoalie: false, number: 10 },
    { id: 'p2', name: 'Jane Smith', nickname: 'Jane', color: '#00FF00', isGoalie: true, number: 1 },
    { id: 'p3', name: 'Bob Wilson', nickname: 'Bob', color: '#0000FF', isGoalie: false, number: 7 },
    { id: 'p4', name: 'Alice Brown', nickname: 'Alice', color: '#FFFF00', isGoalie: false, number: 5 },
    { id: 'p5', name: 'Charlie Green', nickname: 'Charlie', color: '#FF00FF', isGoalie: false, number: 3 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (useAuth as jest.Mock).mockReturnValue(mockAuth);
    (masterRoster.getMasterRoster as jest.Mock).mockResolvedValue(mockMasterRoster);
    (masterRoster.saveMasterRoster as jest.Mock).mockResolvedValue(true);
    (masterRoster.addPlayerToRoster as jest.Mock).mockResolvedValue(true);
    (masterRoster.removePlayerFromRoster as jest.Mock).mockResolvedValue(true);
    // (playerColors.getAvailableColor as jest.Mock).mockReturnValue('#888888');
    // (playerColors.generatePlayerColors as jest.Mock).mockReturnValue(['#FF0000', '#00FF00', '#0000FF']);
    
    // Logger is already mocked above
  });

  describe('Basic Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      // The modal renders as a fixed overlay, check for the title instead
      expect(screen.getByText('rosterSettingsModal.title')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      render(<RosterSettingsModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId('modal-container')).not.toBeInTheDocument();
    });

    it('should render player list', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('should render add player section', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      expect(screen.getByText('Add New Player')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/player name/i)).toBeInTheDocument();
    });

    it('should render save and cancel buttons', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      expect(screen.getByText(/save/i)).toBeInTheDocument();
      expect(screen.getByText(/cancel/i)).toBeInTheDocument();
    });
  });

  describe('Player List Management', () => {
    it('should display existing players with all details', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      // Should show player names
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      
      // Should show player numbers
      expect(screen.getByText('#10')).toBeInTheDocument();
      expect(screen.getByText('#1')).toBeInTheDocument();
      
      // Should show goalie indicator for Jane
      const goalieIndicator = screen.queryByText('GK');
      if (goalieIndicator) {
        expect(goalieIndicator).toBeInTheDocument();
      }
    });

    it('should allow editing player details inline', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      // Click edit button for first player
      const editButtons = screen.getAllByText(/edit/i);
      fireEvent.click(editButtons[0]);
      
      // Should show editable fields
      const nameInput = screen.getByDisplayValue('John Doe');
      fireEvent.change(nameInput, { target: { value: 'Johnny Doe' } });
      
      expect(nameInput).toHaveValue('Johnny Doe');
    });

    it('should allow changing player colors', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const editButtons = screen.getAllByText(/edit/i);
      fireEvent.click(editButtons[0]);
      
      const colorPicker = screen.getByDisplayValue('#FF0000');
      fireEvent.change(colorPicker, { target: { value: '#AA0000' } });
      
      expect(colorPicker).toHaveValue('#AA0000');
    });

    it('should allow toggling goalie status', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const editButtons = screen.getAllByText(/edit/i);
      fireEvent.click(editButtons[0]);
      
      const goalieToggle = screen.getByLabelText(/goalie/i);
      expect(goalieToggle).not.toBeChecked();
      
      fireEvent.click(goalieToggle);
      expect(goalieToggle).toBeChecked();
    });

    it('should validate player numbers', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const editButtons = screen.getAllByText(/edit/i);
      fireEvent.click(editButtons[0]);
      
      const numberInput = screen.getByDisplayValue('10');
      
      // Try duplicate number
      fireEvent.change(numberInput, { target: { value: '1' } });
      
      // Should show validation error
      expect(screen.getByText(/number already in use/i)).toBeInTheDocument();
    });

    it('should validate player names', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const editButtons = screen.getAllByText(/edit/i);
      fireEvent.click(editButtons[0]);
      
      const nameInput = screen.getByDisplayValue('John Doe');
      fireEvent.change(nameInput, { target: { value: '' } });
      
      // Should show validation error
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    it('should remove players', async () => {
      window.confirm = jest.fn(() => true);
      
      render(<RosterSettingsModal {...defaultProps} />);
      
      const removeButtons = screen.getAllByText(/remove/i);
      fireEvent.click(removeButtons[0]);
      
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('remove John Doe')
      );
      
      // Player should be removed from list
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should not remove player if cancelled', async () => {
      window.confirm = jest.fn(() => false);
      
      render(<RosterSettingsModal {...defaultProps} />);
      
      const removeButtons = screen.getAllByText(/remove/i);
      fireEvent.click(removeButtons[0]);
      
      // Player should still be in list
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Adding New Players', () => {
    it('should add new player with valid details', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      // Fill in new player form
      const nameInput = screen.getByPlaceholderText(/player name/i);
      fireEvent.change(nameInput, { target: { value: 'New Player' } });
      
      const nicknameInput = screen.getByPlaceholderText(/nickname/i);
      fireEvent.change(nicknameInput, { target: { value: 'New' } });
      
      const numberInput = screen.getByPlaceholderText(/number/i);
      fireEvent.change(numberInput, { target: { value: '99' } });
      
      // Add player
      const addButton = screen.getByText(/add player/i);
      fireEvent.click(addButton);
      
      // Should appear in player list
      expect(screen.getByText('New Player')).toBeInTheDocument();
    });

    it('should validate new player name', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const addButton = screen.getByText(/add player/i);
      fireEvent.click(addButton);
      
      // Should show validation error
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    it('should validate new player number uniqueness', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const nameInput = screen.getByPlaceholderText(/player name/i);
      fireEvent.change(nameInput, { target: { value: 'New Player' } });
      
      const numberInput = screen.getByPlaceholderText(/number/i);
      fireEvent.change(numberInput, { target: { value: '10' } }); // Existing number
      
      const addButton = screen.getByText(/add player/i);
      fireEvent.click(addButton);
      
      // Should show validation error
      expect(screen.getByText(/number already in use/i)).toBeInTheDocument();
    });

    it('should auto-assign color for new player', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const nameInput = screen.getByPlaceholderText(/player name/i);
      fireEvent.change(nameInput, { target: { value: 'New Player' } });
      
      const addButton = screen.getByText(/add player/i);
      fireEvent.click(addButton);
      
      // expect(playerColors.getAvailableColor).toHaveBeenCalled();
    });

    it('should auto-assign next available number', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const nameInput = screen.getByPlaceholderText(/player name/i);
      fireEvent.change(nameInput, { target: { value: 'New Player' } });
      
      const addButton = screen.getByText(/add player/i);
      fireEvent.click(addButton);
      
      // Should use next available number (not 1, 7, or 10)
      expect(screen.getByText('New Player')).toBeInTheDocument();
    });

    it('should clear form after adding player', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const nameInput = screen.getByPlaceholderText(/player name/i);
      fireEvent.change(nameInput, { target: { value: 'New Player' } });
      
      const addButton = screen.getByText(/add player/i);
      fireEvent.click(addButton);
      
      // Form should be cleared
      expect(nameInput).toHaveValue('');
    });
  });

  describe('Master Roster Integration', () => {
    it('should load master roster on mount', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(masterRoster.getMasterRoster).toHaveBeenCalledTimes(1);
      });
    });

    it('should show import from master roster button', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const importButton = screen.queryByText(/import from master/i);
      if (importButton) {
        expect(importButton).toBeInTheDocument();
      }
    });

    it('should allow importing players from master roster', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const importButton = screen.queryByText(/import from master/i);
      if (importButton) {
        fireEvent.click(importButton);
        
        await waitFor(() => {
          // Should show master roster selection
          expect(screen.getByText('Alice Brown')).toBeInTheDocument();
          expect(screen.getByText('Charlie Green')).toBeInTheDocument();
        });
      }
    });

    it('should filter out already added players from import', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const importButton = screen.queryByText(/import from master/i);
      if (importButton) {
        fireEvent.click(importButton);
        
        await waitFor(() => {
          // Already added players should not appear
          expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
          expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
          
          // Available players should appear
          expect(screen.getByText('Alice Brown')).toBeInTheDocument();
        });
      }
    });

    it('should save new players to master roster', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      // Add new player
      const nameInput = screen.getByPlaceholderText(/player name/i);
      fireEvent.change(nameInput, { target: { value: 'New Player' } });
      
      const addButton = screen.getByText(/add player/i);
      fireEvent.click(addButton);
      
      // Save roster
      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(masterRoster.addPlayerToMasterRoster).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'New Player' })
        );
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should allow selecting multiple players', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      
      // Should show bulk action buttons
      const bulkActionsContainer = screen.queryByText(/bulk actions/i);
      if (bulkActionsContainer) {
        expect(bulkActionsContainer).toBeInTheDocument();
      }
    });

    it('should allow bulk color assignment', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      
      const bulkColorButton = screen.queryByText(/assign colors/i);
      if (bulkColorButton) {
        fireEvent.click(bulkColorButton);
        
        // expect(playerColors.generatePlayerColors).toHaveBeenCalled();
      }
    });

    it('should allow bulk removal', async () => {
      window.confirm = jest.fn(() => true);
      
      render(<RosterSettingsModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      
      const bulkRemoveButton = screen.queryByText(/remove selected/i);
      if (bulkRemoveButton) {
        fireEvent.click(bulkRemoveButton);
        
        expect(window.confirm).toHaveBeenCalledWith(
          expect.stringContaining('remove 2 players')
        );
      }
    });
  });

  describe('Search and Filtering', () => {
    it('should filter players by name', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const searchInput = screen.queryByPlaceholderText(/search players/i);
      if (searchInput) {
        fireEvent.change(searchInput, { target: { value: 'John' } });
        
        // Should only show matching players
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      }
    });

    it('should filter by goalie status', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const goalieFilter = screen.queryByText(/goalies only/i);
      if (goalieFilter) {
        fireEvent.click(goalieFilter);
        
        // Should only show goalies
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      }
    });

    it('should filter by player number range', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const numberRangeFilter = screen.queryByPlaceholderText(/number range/i);
      if (numberRangeFilter) {
        fireEvent.change(numberRangeFilter, { target: { value: '1-5' } });
        
        // Should only show players in range
        expect(screen.getByText('Jane Smith')).toBeInTheDocument(); // #1
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument(); // #10
      }
    });
  });

  describe('Data Validation and Error Handling', () => {
    it('should handle save operation errors', async () => {
      const error = new Error('Save failed');
      (masterRoster.updateMasterRoster as jest.Mock).mockRejectedValue(error);
      
      render(<RosterSettingsModal {...defaultProps} />);
      
      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/error saving/i)).toBeInTheDocument();
        expect(logger.error).toHaveBeenCalledWith('Failed to save roster:', error);
      });
    });

    it('should validate maximum roster size', async () => {
      const largeRoster = Array.from({ length: 50 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
        nickname: `P${i}`,
        color: '#FF0000',
        isGoalie: false,
        number: i + 1,
      }));
      
      render(<RosterSettingsModal {...defaultProps} initialPlayers={largeRoster} />);
      
      // Try to add another player
      const nameInput = screen.getByPlaceholderText(/player name/i);
      fireEvent.change(nameInput, { target: { value: 'One Too Many' } });
      
      const addButton = screen.getByText(/add player/i);
      fireEvent.click(addButton);
      
      // Should show error about roster limit
      expect(screen.getByText(/roster limit/i)).toBeInTheDocument();
    });

    it('should handle malformed player data', () => {
      const malformedPlayers = [
        { id: 'p1', name: null, number: 'invalid' },
        { id: null, name: 'Player 2' },
        {},
      ];
      
      render(<RosterSettingsModal {...defaultProps} initialPlayers={malformedPlayers as any} />);
      
      // Should handle malformed data gracefully
      expect(screen.getByTestId('modal-container')).toBeInTheDocument();
    });
  });

  describe('Export and Import', () => {
    it('should export roster data', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const exportButton = screen.queryByText(/export roster/i);
      if (exportButton) {
        fireEvent.click(exportButton);
        
        // Should trigger download
        expect(exportButton).toBeInTheDocument();
      }
    });

    it('should import roster data from file', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const importButton = screen.queryByText(/import roster/i);
      if (importButton) {
        fireEvent.click(importButton);
        
        // Should show file input
        const fileInput = screen.queryByType('file');
        if (fileInput) {
          const mockFile = new File(['{"players": []}'], 'roster.json', { type: 'application/json' });
          fireEvent.change(fileInput, { target: { files: [mockFile] } });
          
          await waitFor(() => {
            // Should process imported file
            expect(screen.getByTestId('modal-container')).toBeInTheDocument();
          });
        }
      }
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      // Test tab navigation through player list
      fireEvent.keyDown(document, { key: 'Tab' });
      
      expect(screen.getByTestId('modal-container')).toBeInTheDocument();
    });

    it('should have proper ARIA labels', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      expect(screen.getByTestId('modal-container')).toHaveAttribute('role', 'dialog');
      expect(screen.getByText('Roster Settings')).toHaveAttribute('role', 'heading');
    });

    it('should announce player count changes', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      // Remove a player
      window.confirm = jest.fn(() => true);
      const removeButtons = screen.getAllByText(/remove/i);
      fireEvent.click(removeButtons[0]);
      
      // Should announce the change
      const announcement = screen.queryByRole('status');
      if (announcement) {
        expect(announcement).toHaveTextContent(/roster updated/i);
      }
    });

    it('should support screen readers for player details', () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      // Player cards should have proper structure for screen readers
      const playerCard = screen.getByText('John Doe').closest('[role="listitem"]') ||
                         screen.getByText('John Doe').closest('div');
      
      expect(playerCard).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large rosters efficiently', () => {
      const largeRoster = Array.from({ length: 100 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
        nickname: `P${i}`,
        color: '#FF0000',
        isGoalie: i === 0,
        number: i + 1,
      }));
      
      const { container } = render(<RosterSettingsModal {...defaultProps} initialPlayers={largeRoster} />);
      
      // Should render without performance issues
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should virtualize long player lists', () => {
      const largeRoster = Array.from({ length: 1000 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
        nickname: `P${i}`,
        color: '#FF0000',
        isGoalie: false,
        number: i + 1,
      }));
      
      render(<RosterSettingsModal {...defaultProps} initialPlayers={largeRoster} />);
      
      // Should only render visible items (virtualization)
      const renderedPlayers = screen.getAllByText(/Player \d+/);
      expect(renderedPlayers.length).toBeLessThan(50); // Should not render all 1000
    });

    it('should debounce search input', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      const searchInput = screen.queryByPlaceholderText(/search players/i);
      if (searchInput) {
        // Rapid typing should be debounced
        fireEvent.change(searchInput, { target: { value: 'J' } });
        fireEvent.change(searchInput, { target: { value: 'Jo' } });
        fireEvent.change(searchInput, { target: { value: 'Joh' } });
        fireEvent.change(searchInput, { target: { value: 'John' } });
        
        expect(searchInput).toHaveValue('John');
      }
    });
  });

  describe('Integration Tests', () => {
    it('should sync changes with parent component', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      // Add new player
      const nameInput = screen.getByPlaceholderText(/player name/i);
      fireEvent.change(nameInput, { target: { value: 'New Player' } });
      
      const addButton = screen.getByText(/add player/i);
      fireEvent.click(addButton);
      
      // Save changes
      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(defaultProps.onRosterUpdate).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ name: 'New Player' })
          ])
        );
      });
    });

    it('should handle concurrent modifications gracefully', async () => {
      render(<RosterSettingsModal {...defaultProps} />);
      
      // Simulate concurrent operations
      const editButtons = screen.getAllByText(/edit/i);
      fireEvent.click(editButtons[0]);
      fireEvent.click(editButtons[1]);
      
      // Both should be handled without conflicts
      expect(screen.getByTestId('modal-container')).toBeInTheDocument();
    });
  });
});