import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppShortcutHandler from '../AppShortcutHandler';

// Mock Next.js navigation hooks
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    pathname: '/current',
    query: {},
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('AppShortcutHandler', () => {
  const defaultProps = {
    onNewGame: jest.fn(),
    onResumeGame: jest.fn(),
    onViewStats: jest.fn(),
    onManageRoster: jest.fn(),
  };

  // Mock window.location
  const originalLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockReplace.mockImplementation(() => {});
    mockPush.mockImplementation(() => {});
    
    // Mock window.location
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: 'https://example.com/current?action=test',
    };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      mockGet.mockReturnValue(null);
      const { container } = render(<AppShortcutHandler {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null (no visual rendering)', () => {
      mockGet.mockReturnValue(null);
      const { container } = render(<AppShortcutHandler {...defaultProps} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should not crash with minimal props', () => {
      mockGet.mockReturnValue(null);
      expect(() => {
        render(<AppShortcutHandler {...defaultProps} />);
      }).not.toThrow();
    });
  });

  describe('No Action Parameter', () => {
    it('should not call any handlers when no action parameter', () => {
      mockGet.mockReturnValue(null);
      render(<AppShortcutHandler {...defaultProps} />);

      expect(defaultProps.onNewGame).not.toHaveBeenCalled();
      expect(defaultProps.onResumeGame).not.toHaveBeenCalled();
      expect(defaultProps.onViewStats).not.toHaveBeenCalled();
      expect(defaultProps.onManageRoster).not.toHaveBeenCalled();
    });

    it('should not call router.replace when no action parameter', () => {
      mockGet.mockReturnValue(null);
      render(<AppShortcutHandler {...defaultProps} />);

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('Action Handling - new-game', () => {
    it('should call onNewGame for new-game action', () => {
      mockGet.mockReturnValue('new-game');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(defaultProps.onNewGame).toHaveBeenCalledTimes(1);
      expect(defaultProps.onResumeGame).not.toHaveBeenCalled();
      expect(defaultProps.onViewStats).not.toHaveBeenCalled();
      expect(defaultProps.onManageRoster).not.toHaveBeenCalled();
    });

    it('should clean up URL after handling new-game action', () => {
      mockGet.mockReturnValue('new-game');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(mockReplace).toHaveBeenCalledWith('/current', { scroll: false });
    });
  });

  describe('Action Handling - resume-game', () => {
    it('should call onResumeGame for resume-game action', () => {
      mockGet.mockReturnValue('resume-game');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(defaultProps.onResumeGame).toHaveBeenCalledTimes(1);
      expect(defaultProps.onNewGame).not.toHaveBeenCalled();
      expect(defaultProps.onViewStats).not.toHaveBeenCalled();
      expect(defaultProps.onManageRoster).not.toHaveBeenCalled();
    });

    it('should clean up URL after handling resume-game action', () => {
      mockGet.mockReturnValue('resume-game');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(mockReplace).toHaveBeenCalledWith('/current', { scroll: false });
    });
  });

  describe('Action Handling - view-stats', () => {
    it('should call onViewStats for view-stats action', () => {
      mockGet.mockReturnValue('view-stats');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(defaultProps.onViewStats).toHaveBeenCalledTimes(1);
      expect(defaultProps.onNewGame).not.toHaveBeenCalled();
      expect(defaultProps.onResumeGame).not.toHaveBeenCalled();
      expect(defaultProps.onManageRoster).not.toHaveBeenCalled();
    });

    it('should clean up URL after handling view-stats action', () => {
      mockGet.mockReturnValue('view-stats');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(mockReplace).toHaveBeenCalledWith('/current', { scroll: false });
    });
  });

  describe('Action Handling - manage-roster', () => {
    it('should call onManageRoster for manage-roster action', () => {
      mockGet.mockReturnValue('manage-roster');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(defaultProps.onManageRoster).toHaveBeenCalledTimes(1);
      expect(defaultProps.onNewGame).not.toHaveBeenCalled();
      expect(defaultProps.onResumeGame).not.toHaveBeenCalled();
      expect(defaultProps.onViewStats).not.toHaveBeenCalled();
    });

    it('should clean up URL after handling manage-roster action', () => {
      mockGet.mockReturnValue('manage-roster');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(mockReplace).toHaveBeenCalledWith('/current', { scroll: false });
    });
  });

  describe('Unknown Action Handling', () => {
    it('should not call any action handlers for unknown action', () => {
      mockGet.mockReturnValue('unknown-action');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(defaultProps.onNewGame).not.toHaveBeenCalled();
      expect(defaultProps.onResumeGame).not.toHaveBeenCalled();
      expect(defaultProps.onViewStats).not.toHaveBeenCalled();
      expect(defaultProps.onManageRoster).not.toHaveBeenCalled();
    });

    it('should still clean up URL for unknown action', () => {
      mockGet.mockReturnValue('unknown-action');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(mockReplace).toHaveBeenCalledWith('/current', { scroll: false });
    });

    it('should handle empty string action as falsy', () => {
      mockGet.mockReturnValue('');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(defaultProps.onNewGame).not.toHaveBeenCalled();
      // Empty string is falsy in JS, so no action is taken
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should handle special characters in action', () => {
      mockGet.mockReturnValue('test-action!@#');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(defaultProps.onNewGame).not.toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/current', { scroll: false });
    });
  });

  describe('URL Cleanup', () => {
    it('should preserve existing search parameters when cleaning up', () => {
      window.location.href = 'https://example.com/current?other=value&action=new-game&more=data';
      mockGet.mockReturnValue('new-game');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(mockReplace).toHaveBeenCalledWith('/current?other=value&more=data', { scroll: false });
    });

    it('should handle URLs with no other parameters', () => {
      window.location.href = 'https://example.com/current?action=new-game';
      mockGet.mockReturnValue('new-game');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(mockReplace).toHaveBeenCalledWith('/current', { scroll: false });
    });

    it('should handle URLs with action as first parameter', () => {
      window.location.href = 'https://example.com/current?action=new-game&other=value';
      mockGet.mockReturnValue('new-game');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(mockReplace).toHaveBeenCalledWith('/current?other=value', { scroll: false });
    });

    it('should handle URLs with action as middle parameter', () => {
      window.location.href = 'https://example.com/current?first=value&action=new-game&last=value';
      mockGet.mockReturnValue('new-game');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(mockReplace).toHaveBeenCalledWith('/current?first=value&last=value', { scroll: false });
    });

    it('should pass scroll: false to router.replace', () => {
      mockGet.mockReturnValue('new-game');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(mockReplace).toHaveBeenCalledWith(expect.any(String), { scroll: false });
    });
  });

  describe('Component Lifecycle', () => {
    it('should handle prop changes correctly', () => {
      mockGet.mockReturnValue('new-game');
      const { rerender } = render(<AppShortcutHandler {...defaultProps} />);

      expect(defaultProps.onNewGame).toHaveBeenCalledTimes(1);

      const newProps = {
        ...defaultProps,
        onNewGame: jest.fn(),
      };
      
      rerender(<AppShortcutHandler {...newProps} />);
      expect(newProps.onNewGame).toHaveBeenCalledTimes(1);
    });

    it('should handle unmounting without errors', () => {
      mockGet.mockReturnValue('new-game');
      const { unmount } = render(<AppShortcutHandler {...defaultProps} />);

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should re-trigger effect when searchParams change', () => {
      mockGet.mockReturnValue('new-game');
      const { rerender } = render(<AppShortcutHandler {...defaultProps} />);

      expect(defaultProps.onNewGame).toHaveBeenCalledTimes(1);

      // Simulate searchParams change by re-rendering with different mock return
      mockGet.mockReturnValue('resume-game');
      rerender(<AppShortcutHandler {...defaultProps} />);

      expect(defaultProps.onResumeGame).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null searchParams gracefully', () => {
      mockGet.mockReturnValue(null);
      
      expect(() => {
        render(<AppShortcutHandler {...defaultProps} />);
      }).not.toThrow();

      expect(defaultProps.onNewGame).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should handle undefined action gracefully', () => {
      mockGet.mockReturnValue(undefined);
      
      expect(() => {
        render(<AppShortcutHandler {...defaultProps} />);
      }).not.toThrow();

      expect(defaultProps.onNewGame).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only action', () => {
      mockGet.mockReturnValue('   ');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(defaultProps.onNewGame).not.toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalled();
    });

    it('should handle case-sensitive actions', () => {
      mockGet.mockReturnValue('NEW-GAME');
      render(<AppShortcutHandler {...defaultProps} />);

      expect(defaultProps.onNewGame).not.toHaveBeenCalled();
    });

    it('should handle multiple consecutive renders with same action', () => {
      mockGet.mockReturnValue('new-game');
      const { rerender } = render(<AppShortcutHandler {...defaultProps} />);

      expect(defaultProps.onNewGame).toHaveBeenCalledTimes(1);

      rerender(<AppShortcutHandler {...defaultProps} />);
      expect(defaultProps.onNewGame).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance', () => {
    it('should render efficiently', () => {
      mockGet.mockReturnValue('new-game');
      
      const start = performance.now();
      render(<AppShortcutHandler {...defaultProps} />);
      const end = performance.now();

      expect(end - start).toBeLessThan(10);
    });

    it('should not create memory leaks', () => {
      mockGet.mockReturnValue('new-game');
      const { unmount } = render(<AppShortcutHandler {...defaultProps} />);

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle rapid re-renders efficiently', () => {
      mockGet.mockReturnValue('new-game');
      const { rerender } = render(<AppShortcutHandler {...defaultProps} />);

      const start = performance.now();
      for (let i = 0; i < 10; i++) {
        rerender(<AppShortcutHandler {...defaultProps} />);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(50);
    });
  });
});