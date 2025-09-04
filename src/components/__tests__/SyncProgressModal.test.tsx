import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import '@testing-library/jest-dom';
import { SyncProgressModal } from '../SyncProgressModal';

// Mock the hooks
jest.mock('@/hooks/useSyncProgress', () => ({
  useSyncProgress: jest.fn(),
}));

jest.mock('@/hooks/useConnectionStatus', () => ({
  useConnectionStatus: jest.fn(),
}));

import { useSyncProgress } from '@/hooks/useSyncProgress';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

const mockUseSyncProgress = useSyncProgress as jest.MockedFunction<typeof useSyncProgress>;
const mockUseConnectionStatus = useConnectionStatus as jest.MockedFunction<typeof useConnectionStatus>;

describe('SyncProgressModal', () => {
  const mockOnClose = jest.fn();

  const defaultSyncProgress = {
    operations: [],
    isActive: false,
    overallProgress: 0,
    lastSync: null,
    pendingCount: 0,
    failedCount: 0,
    clearCompleted: jest.fn(),
    retryFailed: jest.fn(),
  };

  const defaultConnectionStatus = {
    isOnline: true,
    isSupabaseReachable: true,
    connectionQuality: 'excellent',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSyncProgress.mockReturnValue(defaultSyncProgress);
    mockUseConnectionStatus.mockReturnValue(defaultConnectionStatus);
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
  };

  describe('Modal Rendering', () => {
    test('renders modal when isOpen is true', () => {
      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('Sync Status')).toBeInTheDocument();
      expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
    });

    test('does not render modal when isOpen is false', () => {
      render(<SyncProgressModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Sync Status')).not.toBeInTheDocument();
    });

    test('has proper modal structure and styling', () => {
      render(<SyncProgressModal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog', { hidden: true });
      expect(modal).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50');
    });
  });

  describe('Close Functionality', () => {
    test('calls onClose when close button is clicked', () => {
      render(<SyncProgressModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('close button has proper accessibility', () => {
      render(<SyncProgressModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close');
    });
  });

  describe('Connection Status Display', () => {
    test('shows online status when connected', () => {
      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('🟢 Online')).toBeInTheDocument();
      expect(screen.getByText('Connection Status')).toBeInTheDocument();
    });

    test('shows offline status when not connected', () => {
      mockUseConnectionStatus.mockReturnValue({
        isOnline: false,
        isSupabaseReachable: false,
        connectionQuality: 'poor',
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('🔴 Offline')).toBeInTheDocument();
    });

    test('shows server unreachable status', () => {
      mockUseConnectionStatus.mockReturnValue({
        isOnline: true,
        isSupabaseReachable: false,
        connectionQuality: 'poor',
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('🟡 Server unreachable')).toBeInTheDocument();
    });

    test('displays connection quality', () => {
      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('Connection Quality:')).toBeInTheDocument();
      expect(screen.getByText('excellent')).toBeInTheDocument();
    });

    test('displays last sync time', () => {
      const lastSyncDate = new Date('2024-01-15T10:30:00Z');
      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        lastSync: lastSyncDate,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('Last Sync:')).toBeInTheDocument();
      expect(screen.getByText(lastSyncDate.toLocaleString())).toBeInTheDocument();
    });

    test('shows "Never" when no last sync', () => {
      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('Never')).toBeInTheDocument();
    });
  });

  describe('Active Sync Progress', () => {
    test('shows active sync section when syncing', () => {
      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        isActive: true,
        overallProgress: 45.7,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('Active Sync')).toBeInTheDocument();
      expect(screen.getByText('46%')).toBeInTheDocument();
    });

    test('does not show active sync section when not syncing', () => {
      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.queryByText('Active Sync')).not.toBeInTheDocument();
    });

    test('progress bar reflects current progress', () => {
      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        isActive: true,
        overallProgress: 75,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      const progressBar = screen.getByRole('progressbar', { hidden: true });
      expect(progressBar).toHaveStyle('width: 75%');
    });
  });

  describe('Summary Statistics', () => {
    test('displays operation counts correctly', () => {
      const operations = [
        { id: '1', status: 'completed', type: 'upload', table: 'games', timestamp: Date.now() },
        { id: '2', status: 'completed', type: 'download', table: 'players', timestamp: Date.now() },
        { id: '3', status: 'failed', type: 'upload', table: 'games', timestamp: Date.now() },
      ];

      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        operations,
        pendingCount: 3,
        failedCount: 1,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Completed
      expect(screen.getByText('3')).toBeInTheDocument(); // Pending
      expect(screen.getByText('1')).toBeInTheDocument(); // Failed
    });

    test('shows retry failed button when there are failed operations', () => {
      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        failedCount: 2,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      const retryButton = screen.getByText('Retry Failed');
      expect(retryButton).toBeInTheDocument();
    });

    test('does not show retry failed button when no failed operations', () => {
      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.queryByText('Retry Failed')).not.toBeInTheDocument();
    });

    test('calls retryFailed when retry button clicked', () => {
      const mockRetryFailed = jest.fn();
      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        failedCount: 1,
        retryFailed: mockRetryFailed,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      const retryButton = screen.getByText('Retry Failed');
      fireEvent.click(retryButton);
      
      expect(mockRetryFailed).toHaveBeenCalledTimes(1);
    });

    test('calls clearCompleted when clear button clicked', () => {
      const mockClearCompleted = jest.fn();
      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        clearCompleted: mockClearCompleted,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      const clearButton = screen.getByText('Clear Completed');
      fireEvent.click(clearButton);
      
      expect(mockClearCompleted).toHaveBeenCalledTimes(1);
    });
  });

  describe('Recent Operations List', () => {
    test('shows "No sync operations yet" when empty', () => {
      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('No sync operations yet')).toBeInTheDocument();
    });

    test('displays operations list when present', () => {
      const operations = [
        {
          id: '1',
          type: 'upload',
          table: 'games',
          status: 'completed',
          timestamp: Date.now(),
        },
        {
          id: '2',
          type: 'download',
          table: 'players',
          status: 'syncing',
          progress: 67,
          timestamp: Date.now() - 1000,
        },
      ];

      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        operations,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('upload - games')).toBeInTheDocument();
      expect(screen.getByText('download - players')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('syncing')).toBeInTheDocument();
    });

    test('shows progress percentage for syncing operations', () => {
      const operations = [
        {
          id: '1',
          type: 'upload',
          table: 'games',
          status: 'syncing',
          progress: 73,
          timestamp: Date.now(),
        },
      ];

      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        operations,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('73%')).toBeInTheDocument();
    });

    test('displays operation icons correctly', () => {
      const operations = [
        { id: '1', type: 'upload', status: 'completed', table: 'games', timestamp: Date.now() },
        { id: '2', type: 'download', status: 'syncing', table: 'players', timestamp: Date.now() },
        { id: '3', type: 'conflict_resolve', status: 'failed', table: 'settings', timestamp: Date.now() },
      ];

      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        operations,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('✅')).toBeInTheDocument(); // completed
      expect(screen.getByText('🔄')).toBeInTheDocument(); // syncing
      expect(screen.getByText('❌')).toBeInTheDocument(); // failed
    });

    test('shows error messages for failed operations', () => {
      const operations = [
        {
          id: '1',
          type: 'upload',
          table: 'games',
          status: 'failed',
          error: 'Network timeout occurred',
          timestamp: Date.now(),
        },
      ];

      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        operations,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('Network timeout occurred')).toBeInTheDocument();
    });

    test('formats timestamps correctly', () => {
      const testTime = new Date('2024-01-15T14:30:45Z');
      const operations = [
        {
          id: '1',
          type: 'upload',
          table: 'games',
          status: 'completed',
          timestamp: testTime.getTime(),
        },
      ];

      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        operations,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText(testTime.toLocaleTimeString())).toBeInTheDocument();
    });
  });

  describe('Operation Icon Logic', () => {
    test('getOperationIcon returns correct icons for different states', () => {
      // This tests the internal logic through the UI
      const operations = [
        { id: '1', type: 'upload', status: 'pending', table: 'games', timestamp: Date.now() },
        { id: '2', type: 'download', status: 'pending', table: 'players', timestamp: Date.now() },
        { id: '3', type: 'conflict_resolve', status: 'pending', table: 'settings', timestamp: Date.now() },
        { id: '4', type: 'other', status: 'pending', table: 'misc', timestamp: Date.now() },
      ];

      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        operations,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('⬆️')).toBeInTheDocument(); // upload
      expect(screen.getByText('⬇️')).toBeInTheDocument(); // download  
      expect(screen.getByText('⚡')).toBeInTheDocument(); // conflict_resolve
      expect(screen.getByText('📝')).toBeInTheDocument(); // other
    });
  });

  describe('Status Color Logic', () => {
    test('applies correct CSS classes for different statuses', () => {
      const operations = [
        { id: '1', type: 'upload', status: 'completed', table: 'games', timestamp: Date.now() },
        { id: '2', type: 'upload', status: 'failed', table: 'players', timestamp: Date.now() },
        { id: '3', type: 'upload', status: 'syncing', table: 'settings', timestamp: Date.now() },
      ];

      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        operations,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      const completedStatus = screen.getByText('completed');
      const failedStatus = screen.getByText('failed');
      const syncingStatus = screen.getByText('syncing');
      
      expect(completedStatus).toHaveClass('text-green-600', 'dark:text-green-400');
      expect(failedStatus).toHaveClass('text-red-600', 'dark:text-red-400');
      expect(syncingStatus).toHaveClass('text-blue-600', 'dark:text-blue-400');
    });
  });

  describe('Accessibility', () => {
    test('has proper modal role', () => {
      render(<SyncProgressModal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog', { hidden: true });
      expect(modal).toBeInTheDocument();
    });

    test('close button has screen reader text', () => {
      render(<SyncProgressModal {...defaultProps} />);
      
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    test('progress bar has accessible attributes', () => {
      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        isActive: true,
        overallProgress: 60,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      const progressBar = screen.getByRole('progressbar', { hidden: true });
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('has responsive modal sizing', () => {
      render(<SyncProgressModal {...defaultProps} />);
      
      const modalContainer = screen.getByRole('dialog').children[0];
      expect(modalContainer).toHaveClass('max-w-2xl', 'w-full', 'mx-4');
    });

    test('has scrollable operations list', () => {
      render(<SyncProgressModal {...defaultProps} />);
      
      const operationsList = screen.getByText('Recent Operations').nextElementSibling;
      expect(operationsList).toHaveClass('max-h-64', 'overflow-y-auto');
    });
  });

  describe('Performance', () => {
    test('handles large number of operations efficiently', () => {
      const manyOperations = Array.from({ length: 100 }, (_, i) => ({
        id: `op-${i}`,
        type: 'upload',
        table: 'games',
        status: 'completed',
        timestamp: Date.now() - i * 1000,
      }));

      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        operations: manyOperations,
      });

      render(<SyncProgressModal {...defaultProps} />);
      
      // Should only show recent 20 operations
      const operationElements = screen.getAllByText(/upload - games/);
      expect(operationElements.length).toBeLessThanOrEqual(20);
    });

    test('renders quickly with minimal operations', () => {
      const startTime = performance.now();
      render(<SyncProgressModal {...defaultProps} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('Edge Cases', () => {
    test('handles undefined operations gracefully', () => {
      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        operations: undefined as any,
      });

      expect(() => render(<SyncProgressModal {...defaultProps} />)).not.toThrow();
    });

    test('handles null connection status', () => {
      mockUseConnectionStatus.mockReturnValue({
        isOnline: null as any,
        isSupabaseReachable: null as any,
        connectionQuality: null as any,
      });

      expect(() => render(<SyncProgressModal {...defaultProps} />)).not.toThrow();
    });

    test('handles operations with missing fields', () => {
      const incompleteOperations = [
        { id: '1', timestamp: Date.now() } as any,
        { id: '2', type: 'upload', timestamp: Date.now() } as any,
      ];

      mockUseSyncProgress.mockReturnValue({
        ...defaultSyncProgress,
        operations: incompleteOperations,
      });

      expect(() => render(<SyncProgressModal {...defaultProps} />)).not.toThrow();
    });
  });
});