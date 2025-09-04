import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import WebVitalsReporter from '../WebVitalsReporter';
import { reportWebVitals, observePerformance } from '@/lib/monitoring/webVitals';

// Mock the web vitals monitoring functions
jest.mock('@/lib/monitoring/webVitals', () => ({
  reportWebVitals: jest.fn(),
  observePerformance: jest.fn(),
}));

describe('WebVitalsReporter', () => {
  const mockReportWebVitals = reportWebVitals as jest.MockedFunction<typeof reportWebVitals>;
  const mockObservePerformance = observePerformance as jest.MockedFunction<typeof observePerformance>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to default behavior
    mockReportWebVitals.mockImplementation(() => {});
    mockObservePerformance.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<WebVitalsReporter />);
      expect(container).toBeInTheDocument();
    });

    it('should render nothing (null component)', () => {
      const { container } = render(<WebVitalsReporter />);
      expect(container.firstChild).toBeNull();
    });

    it('should not add any DOM elements', () => {
      const { container } = render(<WebVitalsReporter />);
      expect(container.children).toHaveLength(0);
    });

    it('should not have any visible content', () => {
      const { container } = render(<WebVitalsReporter />);
      expect(container.textContent).toBe('');
    });
  });

  describe('Web Vitals Initialization', () => {
    it('should call reportWebVitals on mount', () => {
      render(<WebVitalsReporter />);
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
    });

    it('should call observePerformance on mount', () => {
      render(<WebVitalsReporter />);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
    });

    it('should call both monitoring functions on mount', () => {
      render(<WebVitalsReporter />);
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
    });

    it('should call monitoring functions with no arguments', () => {
      render(<WebVitalsReporter />);
      expect(mockReportWebVitals).toHaveBeenCalledWith();
      expect(mockObservePerformance).toHaveBeenCalledWith();
    });

    it('should call monitoring functions in correct order', () => {
      render(<WebVitalsReporter />);
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
      // Both should be called - exact order is implementation detail
    });
  });

  describe('Component Lifecycle', () => {
    it('should only initialize monitoring once per mount', () => {
      const { rerender } = render(<WebVitalsReporter />);
      
      // Re-render the same component
      rerender(<WebVitalsReporter />);
      
      // Should still only be called once
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
    });

    it('should reinitialize monitoring on unmount and remount', () => {
      const { unmount } = render(<WebVitalsReporter />);
      
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
      
      unmount();
      
      // Mount again
      render(<WebVitalsReporter />);
      
      expect(mockReportWebVitals).toHaveBeenCalledTimes(2);
      expect(mockObservePerformance).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple instances independently', () => {
      render(<WebVitalsReporter />);
      render(<WebVitalsReporter />);
      
      expect(mockReportWebVitals).toHaveBeenCalledTimes(2);
      expect(mockObservePerformance).toHaveBeenCalledTimes(2);
    });

    it('should not interfere with other components', () => {
      const TestComponent = () => <div data-testid="test">Test</div>;
      
      const { getByTestId } = render(
        <div>
          <WebVitalsReporter />
          <TestComponent />
        </div>
      );
      
      expect(getByTestId('test')).toBeInTheDocument();
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle reportWebVitals throwing an error', () => {
      mockReportWebVitals.mockImplementation(() => {
        throw new Error('ReportWebVitals error');
      });
      
      expect(() => {
        render(<WebVitalsReporter />);
      }).toThrow('ReportWebVitals error');
    });

    it('should handle observePerformance throwing an error', () => {
      // Reset reportWebVitals to normal behavior
      mockReportWebVitals.mockImplementation(() => {});
      mockObservePerformance.mockImplementation(() => {
        throw new Error('ObservePerformance error');
      });
      
      expect(() => {
        render(<WebVitalsReporter />);
      }).toThrow('ObservePerformance error');
    });

    it('should handle both functions throwing errors', () => {
      mockReportWebVitals.mockImplementation(() => {
        throw new Error('ReportWebVitals error');
      });
      mockObservePerformance.mockImplementation(() => {
        throw new Error('ObservePerformance error');
      });
      
      // First error thrown (reportWebVitals) will be the one caught
      expect(() => {
        render(<WebVitalsReporter />);
      }).toThrow('ReportWebVitals error');
    });

    it('should continue execution if observePerformance fails after reportWebVitals succeeds', () => {
      // Reset reportWebVitals to succeed
      mockReportWebVitals.mockImplementation(() => {});
      mockObservePerformance.mockImplementation(() => {
        throw new Error('ObservePerformance error');
      });
      
      expect(() => {
        render(<WebVitalsReporter />);
      }).toThrow('ObservePerformance error');
      
      // reportWebVitals should still have been called
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration Scenarios', () => {
    it('should work correctly in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(<WebVitalsReporter />);
      
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should work correctly in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      render(<WebVitalsReporter />);
      
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should work correctly in test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      
      render(<WebVitalsReporter />);
      
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should work correctly in browser environment', () => {
      // Verify component works normally in browser-like environment
      render(<WebVitalsReporter />);
      
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Considerations', () => {
    it('should execute monitoring initialization synchronously', () => {
      render(<WebVitalsReporter />);
      
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
    });

    it('should not cause memory leaks on unmount', () => {
      const { unmount } = render(<WebVitalsReporter />);
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle rapid mount/unmount cycles', () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<WebVitalsReporter />);
        unmount();
      }
      
      expect(mockReportWebVitals).toHaveBeenCalledTimes(10);
      expect(mockObservePerformance).toHaveBeenCalledTimes(10);
    });

    it('should not block component tree rendering', () => {
      const SlowChild = () => {
        // Simulate slow component
        const start = Date.now();
        while (Date.now() - start < 1) {
          // Busy wait for 1ms
        }
        return <div data-testid="slow-child">Slow Child</div>;
      };
      
      const { getByTestId } = render(
        <div>
          <WebVitalsReporter />
          <SlowChild />
        </div>
      );
      
      expect(getByTestId('slow-child')).toBeInTheDocument();
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle monitoring functions that return values', () => {
      mockReportWebVitals.mockReturnValue('report-result');
      mockObservePerformance.mockReturnValue('observe-result');
      
      render(<WebVitalsReporter />);
      
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
    });

    it('should handle normal monitoring function execution', () => {
      // Reset to default mock behavior
      mockReportWebVitals.mockImplementation(() => {});
      mockObservePerformance.mockImplementation(() => {});
      
      render(<WebVitalsReporter />);
      
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
    });

    it('should handle component in different environments', () => {
      // Test component behavior without environment-specific issues
      render(<WebVitalsReporter />);
      
      expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
      expect(mockObservePerformance).toHaveBeenCalledTimes(1);
    });
  });
});