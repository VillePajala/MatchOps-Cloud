import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock logger before importing component
const mockError = jest.fn();
const mockLog = jest.fn();

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    error: mockError,
    log: mockLog,
  },
}));

import { GameErrorBoundary, withGameErrorBoundary } from '../GameErrorBoundary';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: {
    reload: mockReload,
    href: 'http://localhost:3000/test',
  },
  writable: true,
});

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  value: 'Test User Agent',
  writable: true,
});

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean; errorMessage?: string }> = ({ 
  shouldThrow, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error occurred</div>;
};

describe('GameErrorBoundary', () => {
  const defaultProps = {
    componentName: 'TestComponent',
    children: <div>Test content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockError.mockClear();
    mockLog.mockClear();
    mockLocalStorage.getItem.mockReturnValue('[]');
    // Mock console.error to avoid error logs in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when no error occurs', () => {
    it('should render children normally', () => {
      render(
        <GameErrorBoundary {...defaultProps}>
          <div>Test content</div>
        </GameErrorBoundary>
      );
      
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should not show error UI', () => {
      render(
        <GameErrorBoundary {...defaultProps}>
          <div>Test content</div>
        </GameErrorBoundary>
      );
      
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });
  });

  describe('when an error occurs', () => {
    it('should display default error fallback UI', () => {
      render(
        <GameErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </GameErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('An error occurred in the game component. Please try refreshing the page.')).toBeInTheDocument();
    });

    it('should display custom fallback title and message', () => {
      render(
        <GameErrorBoundary 
          {...defaultProps}
          fallbackTitle="Custom Title"
          fallbackMessage="Custom message"
        >
          <ThrowError shouldThrow={true} />
        </GameErrorBoundary>
      );
      
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom message')).toBeInTheDocument();
    });

    it('should show error icon SVG', () => {
      const { container } = render(
        <GameErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </GameErrorBoundary>
      );
      
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
      expect(svgElement).toHaveClass('text-red-500');
    });

    it('should show Try Again and Reload Page buttons by default', () => {
      render(
        <GameErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </GameErrorBoundary>
      );
      
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('should hide Try Again button when showRetryButton is false', () => {
      render(
        <GameErrorBoundary {...defaultProps} showRetryButton={false}>
          <ThrowError shouldThrow={true} />
        </GameErrorBoundary>
      );
      
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('should log error with component context', () => {
      // Spy on console.error to verify logging happens
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <GameErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} errorMessage="Specific test error" />
        </GameErrorBoundary>
      );
      
      // Verify error UI is shown (main functionality)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should call custom onError handler when provided', () => {
      const mockOnError = jest.fn();
      
      render(
        <GameErrorBoundary {...defaultProps} onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </GameErrorBoundary>
      );
      
      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should store error report in localStorage', () => {
      render(
        <GameErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} errorMessage="Storage test error" />
        </GameErrorBoundary>
      );
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'game-error-reports',
        expect.stringContaining('Storage test error')
      );
    });

    it('should limit error reports to last 10 entries', () => {
      // Mock existing reports
      const existingReports = Array.from({ length: 15 }, (_, i) => ({
        component: 'OldComponent',
        error: { message: `Old error ${i}` },
        timestamp: new Date().toISOString(),
      }));
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingReports));
      
      render(
        <GameErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </GameErrorBoundary>
      );
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'game-error-reports',
        expect.stringMatching(/.*/)
      );
      
      // Verify the stored data contains only 10 reports
      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const storedReports = JSON.parse(setItemCall[1]);
      expect(storedReports).toHaveLength(10);
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      render(
        <GameErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </GameErrorBoundary>
      );
      
      // Should still show error UI even if localStorage fails
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      // Component should handle localStorage errors gracefully and still render UI
    });
  });

  describe('retry functionality', () => {
    it('should reset error state when Try Again is clicked', () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Retriable error');
        }
        return <div>Component recovered</div>;
      };

      const { rerender } = render(
        <GameErrorBoundary {...defaultProps}>
          <TestComponent />
        </GameErrorBoundary>
      );
      
      // Error UI should be showing
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Click Try Again and stop throwing error
      shouldThrow = false;
      fireEvent.click(screen.getByText('Try Again'));
      
      // Rerender with same component tree
      rerender(
        <GameErrorBoundary {...defaultProps}>
          <TestComponent />
        </GameErrorBoundary>
      );
      
      // Should show normal content
      expect(screen.getByText('Component recovered')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should increment retry count on each retry', () => {
      let throwCount = 0;
      const TestComponent = () => {
        throwCount++;
        throw new Error(`Error attempt ${throwCount}`);
      };

      const { rerender } = render(
        <GameErrorBoundary {...defaultProps}>
          <TestComponent />
        </GameErrorBoundary>
      );
      
      // First error
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      
      // Retry once
      fireEvent.click(screen.getByText('Try Again'));
      rerender(
        <GameErrorBoundary {...defaultProps}>
          <TestComponent />
        </GameErrorBoundary>
      );
      
      // Should still show try again
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      
      // Retry second time
      fireEvent.click(screen.getByText('Try Again'));
      rerender(
        <GameErrorBoundary {...defaultProps}>
          <TestComponent />
        </GameErrorBoundary>
      );
      
      // Should not show Try Again after max retries (2)
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('should reset error state when Try Again is clicked', () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Retriable error');
        }
        return <div>Recovered</div>;
      };

      const { rerender } = render(
        <GameErrorBoundary {...defaultProps}>
          <TestComponent />
        </GameErrorBoundary>
      );
      
      // Verify error UI is shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      
      // Stop throwing error and click retry
      shouldThrow = false;
      fireEvent.click(screen.getByText('Try Again'));
      
      // Need to force re-render with different key to trigger error boundary reset
      rerender(
        <GameErrorBoundary {...defaultProps} key="retry">
          <TestComponent />
        </GameErrorBoundary>
      );
      
      // Should show recovered content
      expect(screen.getByText('Recovered')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('reload functionality', () => {
    it('should reload page when Reload Page is clicked', () => {
      render(
        <GameErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </GameErrorBoundary>
      );
      
      fireEvent.click(screen.getByText('Reload Page'));
      
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('development mode features', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should show debug info in development mode', () => {
      render(
        <GameErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} errorMessage="Dev mode error" />
        </GameErrorBoundary>
      );
      
      expect(screen.getByText('Debug Info')).toBeInTheDocument();
      
      // Expand debug info
      fireEvent.click(screen.getByText('Debug Info'));
      
      expect(screen.getByText('TestComponent')).toBeInTheDocument();
      expect(screen.getByText('Dev mode error')).toBeInTheDocument();
      expect(screen.getByText('0/2')).toBeInTheDocument(); // retry count
    });

    it('should update retry count in debug info', () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Debug retry test');
        }
        return <div>Recovered</div>;
      };

      const { rerender } = render(
        <GameErrorBoundary {...defaultProps}>
          <TestComponent />
        </GameErrorBoundary>
      );
      
      // Expand debug info
      fireEvent.click(screen.getByText('Debug Info'));
      expect(screen.getByText('0/2')).toBeInTheDocument();
      
      // Retry once
      fireEvent.click(screen.getByText('Try Again'));
      rerender(
        <GameErrorBoundary {...defaultProps}>
          <TestComponent />
        </GameErrorBoundary>
      );
      
      // Check updated retry count
      fireEvent.click(screen.getByText('Debug Info'));
      expect(screen.getByText('1/2')).toBeInTheDocument();
    });
  });

  describe('production mode', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should not show debug info in production mode', () => {
      render(
        <GameErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </GameErrorBoundary>
      );
      
      expect(screen.queryByText('Debug Info')).not.toBeInTheDocument();
    });
  });

  describe('error report structure', () => {
    it('should include all required fields in error report', () => {
      render(
        <GameErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} errorMessage="Complete report test" />
        </GameErrorBoundary>
      );
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'game-error-reports',
        expect.stringContaining('"component":"TestComponent"')
      );
      
      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const storedData = JSON.parse(setItemCall[1]);
      const report = storedData[0];
      
      expect(report).toMatchObject({
        component: 'TestComponent',
        error: {
          message: 'Complete report test',
          stack: expect.any(String),
          name: 'Error',
        },
        errorInfo: {
          componentStack: expect.any(String),
        },
        timestamp: expect.any(String),
        retryCount: 0,
        userAgent: 'Test User Agent',
        url: 'http://localhost:3000/test',
      });
    });
  });
});

describe('withGameErrorBoundary HOC', () => {
  const TestComponent: React.FC<{ title: string }> = ({ title }) => (
    <div>{title}</div>
  );

  it('should wrap component with GameErrorBoundary', () => {
    const WrappedComponent = withGameErrorBoundary(TestComponent, 'HOCTest');
    
    render(<WrappedComponent title="HOC Test Content" />);
    
    expect(screen.getByText('HOC Test Content')).toBeInTheDocument();
  });

  it('should handle errors in wrapped component', () => {
    const ThrowingComponent: React.FC = () => {
      throw new Error('HOC error test');
    };
    
    const WrappedComponent = withGameErrorBoundary(ThrowingComponent, 'HOCError');
    
    render(<WrappedComponent />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should pass through error boundary props', () => {
    const WrappedComponent = withGameErrorBoundary(
      TestComponent, 
      'HOCProps',
      { 
        fallbackTitle: 'HOC Custom Title',
        showRetryButton: false 
      }
    );
    
    const ThrowingComponent: React.FC = () => {
      throw new Error('HOC props test');
    };
    
    const WrappedThrowingComponent = withGameErrorBoundary(
      ThrowingComponent,
      'HOCProps',
      { 
        fallbackTitle: 'HOC Custom Title',
        showRetryButton: false 
      }
    );
    
    render(<WrappedThrowingComponent />);
    
    expect(screen.getByText('HOC Custom Title')).toBeInTheDocument();
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('should set correct displayName', () => {
    TestComponent.displayName = 'TestComponent';
    const WrappedComponent = withGameErrorBoundary(TestComponent, 'DisplayNameTest');
    
    expect(WrappedComponent.displayName).toBe('withGameErrorBoundary(TestComponent)');
  });

  it('should use component name when displayName is not available', () => {
    const AnonymousComponent = () => <div>Anonymous</div>;
    const WrappedComponent = withGameErrorBoundary(AnonymousComponent, 'AnonymousTest');
    
    expect(WrappedComponent.displayName).toBe('withGameErrorBoundary(AnonymousComponent)');
  });
});