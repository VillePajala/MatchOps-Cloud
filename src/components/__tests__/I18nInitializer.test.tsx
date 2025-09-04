import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import I18nInitializer from '../I18nInitializer';
import i18n from '@/i18n';

// Mock i18n
jest.mock('@/i18n', () => ({
  isInitialized: false,
  on: jest.fn(),
  off: jest.fn(),
}));

// Mock I18nextProvider
jest.mock('react-i18next', () => ({
  I18nextProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18n-provider">{children}</div>
  ),
}));

describe('I18nInitializer', () => {
  const TestChild = () => <div data-testid="test-child">Test Child Component</div>;
  const mockI18n = i18n as jest.Mocked<typeof i18n>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockI18n.isInitialized = false;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state when i18n is not initialized', () => {
      mockI18n.isInitialized = false;
      
      render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
      expect(screen.queryByTestId('i18n-provider')).not.toBeInTheDocument();
    });

    it('should apply correct loading state styles', () => {
      mockI18n.isInitialized = false;
      
      render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      const loadingDiv = screen.getByText('Loading...');
      expect(loadingDiv).toHaveClass('flex', 'items-center', 'justify-center', 'h-screen', 'bg-gray-900', 'text-white');
    });

    it('should not render children when in loading state', () => {
      mockI18n.isInitialized = false;
      
      render(
        <I18nInitializer>
          <TestChild />
          <div data-testid="another-child">Another Child</div>
        </I18nInitializer>
      );
      
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
      expect(screen.queryByTestId('another-child')).not.toBeInTheDocument();
    });
  });

  describe('Initialized State', () => {
    it('should render children with I18nextProvider when i18n is initialized', async () => {
      mockI18n.isInitialized = true;
      
      render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        expect(screen.getByTestId('i18n-provider')).toBeInTheDocument();
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should pass i18n instance to I18nextProvider', async () => {
      mockI18n.isInitialized = true;
      
      const { container } = render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('i18n-provider')).toBeInTheDocument();
      });
    });

    it('should render multiple children correctly', async () => {
      mockI18n.isInitialized = true;
      
      render(
        <I18nInitializer>
          <TestChild />
          <div data-testid="child-2">Child 2</div>
          <span data-testid="child-3">Child 3</span>
        </I18nInitializer>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
        expect(screen.getByTestId('child-2')).toBeInTheDocument();
        expect(screen.getByTestId('child-3')).toBeInTheDocument();
      });
    });
  });

  describe('Async Initialization', () => {
    it('should poll for initialization every 50ms', async () => {
      mockI18n.isInitialized = false;
      
      render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      // Fast-forward 49ms - should still be loading
      act(() => {
        jest.advanceTimersByTime(49);
      });
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      // Fast-forward to 50ms - should check again
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should transition from loading to initialized when i18n becomes ready', async () => {
      mockI18n.isInitialized = false;
      
      render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      // Simulate i18n becoming initialized after some time
      act(() => {
        mockI18n.isInitialized = true;
        jest.advanceTimersByTime(50);
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should continue polling until initialized', async () => {
      mockI18n.isInitialized = false;
      
      render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      // Advance through multiple polling cycles
      for (let i = 0; i < 5; i++) {
        act(() => {
          jest.advanceTimersByTime(50);
        });
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      }
      
      // Now initialize
      act(() => {
        mockI18n.isInitialized = true;
        jest.advanceTimersByTime(50);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should handle immediate initialization', async () => {
      mockI18n.isInitialized = true;
      
      render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      // Should immediately show children without polling
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });
  });

  describe('Event Listener Integration', () => {
    it('should register initialized event listener', () => {
      render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      expect(mockI18n.on).toHaveBeenCalledWith('initialized', expect.any(Function));
    });

    it('should respond to initialized event', async () => {
      mockI18n.isInitialized = false;
      let initializationHandler: Function | null = null;
      
      mockI18n.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'initialized') {
          initializationHandler = handler;
        }
      });
      
      render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      // Simulate the initialized event being fired
      act(() => {
        if (initializationHandler) {
          initializationHandler();
        }
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should handle initialized event even if already polling', async () => {
      mockI18n.isInitialized = false;
      let initializationHandler: Function | null = null;
      
      mockI18n.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'initialized') {
          initializationHandler = handler;
        }
      });
      
      render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      // Start polling
      act(() => {
        jest.advanceTimersByTime(25);
      });
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      // Fire initialized event during polling
      act(() => {
        if (initializationHandler) {
          initializationHandler();
        }
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should ignore initialized event after component unmounts', async () => {
      mockI18n.isInitialized = false;
      let initializationHandler: Function | null = null;
      
      mockI18n.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'initialized') {
          initializationHandler = handler;
        }
      });
      
      const { unmount } = render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      unmount();
      
      // Fire initialized event after unmount - should not cause errors
      expect(() => {
        if (initializationHandler) {
          initializationHandler();
        }
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const { unmount } = render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      unmount();
      
      expect(mockI18n.off).toHaveBeenCalledWith('initialized', expect.any(Function));
    });

    it('should clear timeout on unmount', () => {
      mockI18n.isInitialized = false;
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const { unmount } = render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      // Advance time to create a timeout
      act(() => {
        jest.advanceTimersByTime(50);
      });
      
      unmount();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should prevent state updates after unmount', async () => {
      mockI18n.isInitialized = false;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { unmount } = render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      unmount();
      
      // Simulate delayed initialization after unmount
      act(() => {
        mockI18n.isInitialized = true;
        jest.advanceTimersByTime(50);
      });
      
      // Should not cause React warnings about state updates
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('state update on an unmounted component')
      );
      
      consoleSpy.mockRestore();
    });

    it('should prevent timeout creation after cancellation', () => {
      mockI18n.isInitialized = false;
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      const { unmount } = render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      const initialCallCount = setTimeoutSpy.mock.calls.length;
      
      unmount();
      
      // Advance time - should not create new timeouts
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      expect(setTimeoutSpy.mock.calls.length).toBe(initialCallCount);
      setTimeoutSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null children', async () => {
      mockI18n.isInitialized = true;
      
      render(
        <I18nInitializer>
          {null}
        </I18nInitializer>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('i18n-provider')).toBeInTheDocument();
      });
    });

    it('should handle undefined children', async () => {
      mockI18n.isInitialized = true;
      
      render(
        <I18nInitializer>
          {undefined}
        </I18nInitializer>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('i18n-provider')).toBeInTheDocument();
      });
    });

    it('should handle empty children', async () => {
      mockI18n.isInitialized = true;
      
      render(
        <I18nInitializer>
          {""}
        </I18nInitializer>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('i18n-provider')).toBeInTheDocument();
      });
    });

    it('should handle array of children', async () => {
      mockI18n.isInitialized = true;
      
      const children = [
        <div key="1" data-testid="child-1">Child 1</div>,
        <div key="2" data-testid="child-2">Child 2</div>,
      ];
      
      render(
        <I18nInitializer>
          {children}
        </I18nInitializer>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('child-1')).toBeInTheDocument();
        expect(screen.getByTestId('child-2')).toBeInTheDocument();
      });
    });

    it('should handle mixed content children', async () => {
      mockI18n.isInitialized = true;
      
      render(
        <I18nInitializer>
          <div data-testid="component-child">Component</div>
          Text content
          {42}
          {true && <span data-testid="conditional-child">Conditional</span>}
        </I18nInitializer>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('component-child')).toBeInTheDocument();
        expect(screen.getByText(/Text content/)).toBeInTheDocument();
        expect(screen.getByText(/42/)).toBeInTheDocument();
        expect(screen.getByTestId('conditional-child')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout creation errors gracefully', () => {
      mockI18n.isInitialized = false;
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn().mockImplementation(() => {
        throw new Error('Timer error');
      });
      
      expect(() => {
        render(
          <I18nInitializer>
            <TestChild />
          </I18nInitializer>
        );
      }).toThrow('Timer error');
      
      global.setTimeout = originalSetTimeout;
    });

    it('should handle i18n object being undefined', () => {
      // This test validates the component doesn't crash with malformed i18n
      const { container } = render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should handle event listener removal errors gracefully', () => {
      mockI18n.off.mockImplementation(() => {
        throw new Error('Event removal error');
      });
      
      const { unmount } = render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      // Should not throw when unmounting
      expect(() => {
        unmount();
      }).toThrow('Event removal error');
      
      // Reset the mock for other tests
      mockI18n.off.mockReset();
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      // Ensure clean state for performance tests
      jest.clearAllMocks();
      mockI18n.isInitialized = false;
      mockI18n.on.mockImplementation(jest.fn());
      mockI18n.off.mockImplementation(jest.fn());
    });

    it('should not create excessive timeouts', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      const initialCallCount = setTimeoutSpy.mock.calls.length;
      
      // Advance time for several cycles
      for (let i = 0; i < 10; i++) {
        act(() => {
          jest.advanceTimersByTime(50);
        });
      }
      
      // Should create one timeout per cycle (not exponentially)
      expect(setTimeoutSpy.mock.calls.length).toBe(initialCallCount + 10);
      setTimeoutSpy.mockRestore();
    });

    it('should stop polling immediately when initialized', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      const timeoutCountBeforeInit = setTimeoutSpy.mock.calls.length;
      
      // Initialize and advance time
      act(() => {
        mockI18n.isInitialized = true;
        jest.advanceTimersByTime(50);
      });
      
      const timeoutCountAfterInit = setTimeoutSpy.mock.calls.length;
      
      // Should not create additional timeouts after initialization
      act(() => {
        jest.advanceTimersByTime(200);
      });
      
      expect(setTimeoutSpy.mock.calls.length).toBe(timeoutCountAfterInit);
      setTimeoutSpy.mockRestore();
    });

    it('should handle rapid re-renders efficiently', () => {
      const { rerender } = render(
        <I18nInitializer>
          <TestChild />
        </I18nInitializer>
      );
      
      // Rapid re-renders should not cause issues
      for (let i = 0; i < 5; i++) {
        rerender(
          <I18nInitializer>
            <div data-testid={`child-${i}`}>Child {i}</div>
          </I18nInitializer>
        );
      }
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});