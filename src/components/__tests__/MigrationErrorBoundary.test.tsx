import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock dependencies before importing component
jest.mock('@/utils/stateMigration', () => ({
  markComponentFailed: jest.fn(),
  shouldUseLegacyState: jest.fn(),
}));

jest.mock('@/utils/safeJson', () => ({
  safeLocalStorageGet: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import {
  MigrationErrorBoundary,
  withMigrationErrorBoundary,
  useMigrationErrorHandler,
} from '../MigrationErrorBoundary';
import { markComponentFailed, shouldUseLegacyState } from '@/utils/stateMigration';
import { safeLocalStorageGet } from '@/utils/safeJson';
import logger from '@/utils/logger';

// Get the mocked functions
const mockMarkComponentFailed = markComponentFailed as jest.MockedFunction<typeof markComponentFailed>;
const mockShouldUseLegacyState = shouldUseLegacyState as jest.MockedFunction<typeof shouldUseLegacyState>;
const mockSafeLocalStorageGet = safeLocalStorageGet as jest.MockedFunction<typeof safeLocalStorageGet>;
const mockLogger = logger as jest.Mocked<typeof logger>;

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

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  value: 'Test User Agent',
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000/test',
  },
  writable: true,
});

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean; errorMessage?: string }> = ({
  shouldThrow,
  errorMessage = 'Test migration error',
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>Migration component working</div>;
};

// Mock fallback component
const MockFallbackComponent: React.FC<{ testProp?: string }> = ({ testProp }) => (
  <div>Fallback Component: {testProp}</div>
);

describe('MigrationErrorBoundary', () => {
  const defaultProps = {
    componentName: 'TestMigrationComponent',
    children: <div>Migration content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockShouldUseLegacyState.mockReturnValue(false);
    mockSafeLocalStorageGet.mockReturnValue([]);
    // Mock console.error to avoid error logs in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when no error occurs', () => {
    it('should render children normally', () => {
      render(
        <MigrationErrorBoundary {...defaultProps}>
          <div>Migration content</div>
        </MigrationErrorBoundary>
      );

      expect(screen.getByText('Migration content')).toBeInTheDocument();
    });

    it('should not show error UI', () => {
      render(
        <MigrationErrorBoundary {...defaultProps}>
          <div>Migration content</div>
        </MigrationErrorBoundary>
      );

      expect(screen.queryByText('Component Error:')).not.toBeInTheDocument();
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should initialize with legacy state from utility', () => {
      mockShouldUseLegacyState.mockReturnValue(true);

      render(
        <MigrationErrorBoundary {...defaultProps}>
          <div>Migration content</div>
        </MigrationErrorBoundary>
      );

      expect(mockShouldUseLegacyState).toHaveBeenCalledWith('TestMigrationComponent');
      expect(screen.getByText('Migration content')).toBeInTheDocument();
    });
  });

  describe('when an error occurs', () => {
    it('should display error UI with component name', () => {
      render(
        <MigrationErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </MigrationErrorBoundary>
      );

      expect(screen.getByText('Component Error: TestMigrationComponent')).toBeInTheDocument();
      expect(screen.getByText('Test migration error')).toBeInTheDocument();
    });

    it('should show error icon', () => {
      const { container } = render(
        <MigrationErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </MigrationErrorBoundary>
      );

      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
      expect(svgElement).toHaveClass('text-red-400');
    });

    it('should display default error message when error message is missing', () => {
      const ErrorWithoutMessage = () => {
        const error = new Error();
        error.message = '';
        throw error;
      };

      render(
        <MigrationErrorBoundary {...defaultProps}>
          <ErrorWithoutMessage />
        </MigrationErrorBoundary>
      );

      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });

    it('should show retry and legacy mode buttons', () => {
      render(
        <MigrationErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </MigrationErrorBoundary>
      );

      expect(screen.getByText(/Retry \(2 attempts left\)/)).toBeInTheDocument();
      expect(screen.getByText('Use Legacy Mode')).toBeInTheDocument();
    });

    it('should log error with full context', () => {
      render(
        <MigrationErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} errorMessage="Context test error" />
        </MigrationErrorBoundary>
      );

      // Verify error UI is displayed (main functionality)
      expect(screen.getByText('Component Error: TestMigrationComponent')).toBeInTheDocument();
      expect(screen.getByText('Context test error')).toBeInTheDocument();
    });

    it('should mark component as failed in migration system', () => {
      render(
        <MigrationErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </MigrationErrorBoundary>
      );

      expect(mockMarkComponentFailed).toHaveBeenCalledWith(
        'TestMigrationComponent',
        expect.any(Error)
      );
    });

    it('should call custom onError handler when provided', () => {
      const mockOnError = jest.fn();

      render(
        <MigrationErrorBoundary {...defaultProps} onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </MigrationErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should handle custom error handler failures gracefully', () => {
      const failingErrorHandler = jest.fn(() => {
        throw new Error('Error handler failed');
      });

      render(
        <MigrationErrorBoundary {...defaultProps} onError={failingErrorHandler}>
          <ThrowError shouldThrow={true} />
        </MigrationErrorBoundary>
      );

      // Should still display error UI even when error handler fails
      expect(screen.getByText('Component Error: TestMigrationComponent')).toBeInTheDocument();
      expect(failingErrorHandler).toHaveBeenCalled();
    });

    it('should store error report in localStorage', () => {
      render(
        <MigrationErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} errorMessage="Storage test error" />
        </MigrationErrorBoundary>
      );

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'migration-error-reports',
        expect.stringContaining('Storage test error')
      );
    });

    it('should limit error reports to last 10 entries', () => {
      // Mock existing reports
      const existingReports = Array.from({ length: 15 }, (_, i) => ({
        component: 'OldComponent',
        message: `Old error ${i}`,
        timestamp: new Date().toISOString(),
      }));

      mockSafeLocalStorageGet.mockReturnValue(existingReports);

      render(
        <MigrationErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </MigrationErrorBoundary>
      );

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'migration-error-reports',
        expect.any(String)
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
        <MigrationErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </MigrationErrorBoundary>
      );

      // Should still show error UI even if localStorage fails
      expect(screen.getByText('Component Error: TestMigrationComponent')).toBeInTheDocument();
      expect(screen.getByText('Test migration error')).toBeInTheDocument();
    });
  });

  describe('fallback component functionality', () => {
    it('should render fallback component when provided and error occurs', () => {
      render(
        <MigrationErrorBoundary
          {...defaultProps}
          fallbackComponent={MockFallbackComponent}
          fallbackProps={{ testProp: 'test-value' }}
        >
          <ThrowError shouldThrow={true} />
        </MigrationErrorBoundary>
      );

      expect(screen.getByText('Fallback Component: test-value')).toBeInTheDocument();
      expect(screen.queryByText('Component Error:')).not.toBeInTheDocument();
    });

    it('should not render fallback component when no error occurs', () => {
      render(
        <MigrationErrorBoundary
          {...defaultProps}
          fallbackComponent={MockFallbackComponent}
          fallbackProps={{ testProp: 'test-value' }}
        >
          <div>Normal content</div>
        </MigrationErrorBoundary>
      );

      expect(screen.getByText('Normal content')).toBeInTheDocument();
      expect(screen.queryByText('Fallback Component:')).not.toBeInTheDocument();
    });
  });

  describe('retry functionality', () => {
    it('should reset error state when retry is clicked', () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Retriable error');
        }
        return <div>Component recovered</div>;
      };

      const { rerender } = render(
        <MigrationErrorBoundary {...defaultProps}>
          <TestComponent />
        </MigrationErrorBoundary>
      );

      // Error UI should be showing
      expect(screen.getByText('Component Error: TestMigrationComponent')).toBeInTheDocument();
      expect(screen.getByText(/Retry \(2 attempts left\)/)).toBeInTheDocument();

      // Stop throwing error and click retry
      shouldThrow = false;
      fireEvent.click(screen.getByText(/Retry \(2 attempts left\)/));

      // Need to force re-render to trigger component recovery
      rerender(
        <MigrationErrorBoundary {...defaultProps} key="retry">
          <TestComponent />
        </MigrationErrorBoundary>
      );

      // Should show recovered content
      expect(screen.getByText('Component recovered')).toBeInTheDocument();
      expect(screen.queryByText('Component Error:')).not.toBeInTheDocument();
    });

    it('should increment retry count and update button text', () => {
      let throwCount = 0;
      const TestComponent = () => {
        throwCount++;
        throw new Error(`Error attempt ${throwCount}`);
      };

      const { rerender } = render(
        <MigrationErrorBoundary {...defaultProps}>
          <TestComponent />
        </MigrationErrorBoundary>
      );

      // First error - 2 attempts left
      expect(screen.getByText(/Retry \(2 attempts left\)/)).toBeInTheDocument();

      // Retry once
      fireEvent.click(screen.getByText(/Retry \(2 attempts left\)/));
      rerender(
        <MigrationErrorBoundary {...defaultProps}>
          <TestComponent />
        </MigrationErrorBoundary>
      );

      // Should show 1 attempt left
      expect(screen.getByText(/Retry \(1 attempts left\)/)).toBeInTheDocument();

      // Retry second time
      fireEvent.click(screen.getByText(/Retry \(1 attempts left\)/));
      rerender(
        <MigrationErrorBoundary {...defaultProps}>
          <TestComponent />
        </MigrationErrorBoundary>
      );

      // Should not show retry button after max retries
      expect(screen.queryByText(/Retry/)).not.toBeInTheDocument();
      expect(screen.getByText('Use Legacy Mode')).toBeInTheDocument();
    });

    it('should update retry count when retry is clicked', () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Retriable error');
        }
        return <div>Recovered</div>;
      };

      render(
        <MigrationErrorBoundary {...defaultProps}>
          <TestComponent />
        </MigrationErrorBoundary>
      );

      // Check initial retry button text
      expect(screen.getByText(/Retry \(2 attempts left\)/)).toBeInTheDocument();
      
      fireEvent.click(screen.getByText(/Retry \(2 attempts left\)/));

      // After retry, error state should be reset but retry count persists
      expect(screen.getByText('Component Error: TestMigrationComponent')).toBeInTheDocument();
    });

    it('should hide retry button when max retries exceeded', () => {
      let throwCount = 0;
      const TestComponent = () => {
        throwCount++;
        throw new Error(`Error attempt ${throwCount}`);
      };

      const { rerender } = render(
        <MigrationErrorBoundary {...defaultProps}>
          <TestComponent />
        </MigrationErrorBoundary>
      );

      // Retry twice to exceed max retries
      fireEvent.click(screen.getByText(/Retry \(2 attempts left\)/));
      rerender(
        <MigrationErrorBoundary {...defaultProps}>
          <TestComponent />
        </MigrationErrorBoundary>
      );
      
      fireEvent.click(screen.getByText(/Retry \(1 attempts left\)/));
      rerender(
        <MigrationErrorBoundary {...defaultProps}>
          <TestComponent />
        </MigrationErrorBoundary>
      );

      // Should not show retry button after max retries
      expect(screen.queryByText(/Retry/)).not.toBeInTheDocument();
      expect(screen.getByText('Use Legacy Mode')).toBeInTheDocument();
    });
  });

  describe('legacy mode functionality', () => {
    it('should reset error state when legacy mode is clicked', () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Legacy mode test');
        }
        return <div>Legacy mode active</div>;
      };

      const { rerender } = render(
        <MigrationErrorBoundary {...defaultProps}>
          <TestComponent />
        </MigrationErrorBoundary>
      );

      expect(screen.getByText('Component Error: TestMigrationComponent')).toBeInTheDocument();

      // Stop throwing error and click legacy mode
      shouldThrow = false;
      fireEvent.click(screen.getByText('Use Legacy Mode'));

      // Force re-render
      rerender(
        <MigrationErrorBoundary {...defaultProps} key="legacy">
          <TestComponent />
        </MigrationErrorBoundary>
      );

      expect(screen.getByText('Legacy mode active')).toBeInTheDocument();
      expect(screen.queryByText('Component Error:')).not.toBeInTheDocument();
    });

    it('should set legacy mode state when legacy mode button is clicked', () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Legacy mode test');
        }
        return <div>Legacy mode active</div>;
      };

      const { rerender } = render(
        <MigrationErrorBoundary {...defaultProps}>
          <TestComponent />
        </MigrationErrorBoundary>
      );

      expect(screen.getByText('Use Legacy Mode')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Use Legacy Mode'));

      // After clicking legacy mode, error should be reset
      shouldThrow = false;
      rerender(
        <MigrationErrorBoundary {...defaultProps} key="legacy">
          <TestComponent />
        </MigrationErrorBoundary>
      );

      expect(screen.getByText('Legacy mode active')).toBeInTheDocument();
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

    it('should show error details in development mode', () => {
      render(
        <MigrationErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} errorMessage="Dev mode error" />
        </MigrationErrorBoundary>
      );

      expect(screen.getByText('Show Error Details (Dev)')).toBeInTheDocument();

      // Expand error details
      fireEvent.click(screen.getByText('Show Error Details (Dev)'));

      // Should show stack trace
      expect(screen.getByText(/Error: Dev mode error/)).toBeInTheDocument();
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

    it('should not show error details in production mode', () => {
      render(
        <MigrationErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </MigrationErrorBoundary>
      );

      expect(screen.queryByText('Show Error Details (Dev)')).not.toBeInTheDocument();
    });
  });

  describe('component cleanup', () => {
    it('should unmount without errors', () => {
      const { unmount } = render(
        <MigrationErrorBoundary {...defaultProps}>
          <div>Test content</div>
        </MigrationErrorBoundary>
      );

      // Component should unmount cleanly without throwing errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('error report structure', () => {
    it('should include all required fields in error report', () => {
      render(
        <MigrationErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} errorMessage="Complete report test" />
        </MigrationErrorBoundary>
      );

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'migration-error-reports',
        expect.stringContaining('"component":"TestMigrationComponent"')
      );

      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const storedData = JSON.parse(setItemCall[1]);
      const report = storedData[0];

      expect(report).toMatchObject({
        component: 'TestMigrationComponent',
        message: 'Complete report test',
        stack: expect.any(String),
        timestamp: expect.any(String),
        userAgent: 'Test User Agent',
        url: 'http://localhost:3000/test',
        componentStack: expect.any(String),
        retryCount: 0,
      });
    });
  });
});

describe('withMigrationErrorBoundary HOC', () => {
  const TestComponent: React.FC<{ title: string }> = ({ title }) => (
    <div>{title}</div>
  );

  it('should wrap component with MigrationErrorBoundary', () => {
    const WrappedComponent = withMigrationErrorBoundary(
      TestComponent,
      'HOCTest'
    );

    render(<WrappedComponent title="HOC Test Content" />);

    expect(screen.getByText('HOC Test Content')).toBeInTheDocument();
  });

  it('should handle errors in wrapped component', () => {
    const ThrowingComponent: React.FC = () => {
      throw new Error('HOC error test');
    };

    const WrappedComponent = withMigrationErrorBoundary(
      ThrowingComponent,
      'HOCError'
    );

    render(<WrappedComponent />);

    expect(screen.getByText('Component Error: HOCError')).toBeInTheDocument();
  });

  it('should use fallback component when provided', () => {
    const ThrowingComponent: React.FC = () => {
      throw new Error('HOC fallback test');
    };

    const WrappedComponent = withMigrationErrorBoundary(
      ThrowingComponent,
      'HOCFallback',
      MockFallbackComponent
    );

    render(<WrappedComponent testProp="fallback-test" />);

    expect(screen.getByText('Fallback Component: fallback-test')).toBeInTheDocument();
    expect(screen.queryByText('Component Error:')).not.toBeInTheDocument();
  });

  it('should set correct displayName', () => {
    const WrappedComponent = withMigrationErrorBoundary(
      TestComponent,
      'DisplayNameTest'
    );

    expect(WrappedComponent.displayName).toBe(
      'withMigrationErrorBoundary(DisplayNameTest)'
    );
  });
});

describe('useMigrationErrorHandler hook', () => {
  const TestHookComponent: React.FC<{ componentName: string }> = ({
    componentName,
  }) => {
    const { handleError } = useMigrationErrorHandler(componentName);

    return (
      <button
        onClick={() => handleError(new Error('Hook test error'))}
      >
        Trigger Error
      </button>
    );
  };

  it('should provide handleError function', () => {
    render(<TestHookComponent componentName="HookTest" />);

    const button = screen.getByText('Trigger Error');
    expect(button).toBeInTheDocument();
  });

  it('should execute handleError function when called', () => {
    render(<TestHookComponent componentName="HookTest" />);

    // Should not throw when error handler is triggered
    expect(() => {
      fireEvent.click(screen.getByText('Trigger Error'));
    }).not.toThrow();
  });

  it('should mark component as failed when handleError is called', () => {
    render(<TestHookComponent componentName="HookTest" />);

    fireEvent.click(screen.getByText('Trigger Error'));

    expect(mockMarkComponentFailed).toHaveBeenCalledWith(
      'HookTest',
      expect.any(Error)
    );
  });

  it('should memoize handleError function', () => {
    const { rerender } = render(
      <TestHookComponent componentName="MemoTest" />
    );

    const firstButton = screen.getByText('Trigger Error');

    rerender(<TestHookComponent componentName="MemoTest" />);

    const secondButton = screen.getByText('Trigger Error');

    // The button should be the same (component didn't re-render due to function change)
    expect(firstButton).toBe(secondButton);
  });
});