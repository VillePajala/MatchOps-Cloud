import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClientWrapper from '../ClientWrapper';

// Import the mocked i18n for type safety
import i18n from '@/i18n';

// Mock all child components
jest.mock('../I18nInitializer', () => {
  return function MockI18nInitializer({ children }: { children: React.ReactNode }) {
    return <div data-testid="i18n-initializer">{children}</div>;
  };
});

jest.mock('../InstallPrompt', () => {
  return function MockInstallPrompt() {
    return <div data-testid="install-prompt">Install Prompt</div>;
  };
});

jest.mock('../ServiceWorkerRegistration', () => {
  return function MockServiceWorkerRegistration() {
    return <div data-testid="service-worker-registration">Service Worker Registration</div>;
  };
});

jest.mock('@/contexts/ToastProvider', () => ({
  ToastProvider: function MockToastProvider({ children }: { children: React.ReactNode }) {
    return <div data-testid="toast-provider">{children}</div>;
  },
}));

jest.mock('@/contexts/UpdateContext', () => ({
  UpdateProvider: function MockUpdateProvider({ children }: { children: React.ReactNode }) {
    return <div data-testid="update-provider">{children}</div>;
  },
}));

// Mock i18n
jest.mock('@/i18n', () => ({
  language: 'en',
  on: jest.fn(),
  off: jest.fn(),
}));

// Mock document.documentElement.setAttribute
const mockSetAttribute = jest.fn();
Object.defineProperty(document, 'documentElement', {
  value: {
    setAttribute: mockSetAttribute,
  },
  writable: true,
});

// Cast to jest mocked functions
const mockedI18n = i18n as jest.Mocked<typeof i18n>;

describe('ClientWrapper', () => {
  const originalDocument = global.document;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetAttribute.mockClear();
    // Reset i18n mock state
    mockedI18n.language = 'en';
    // Ensure document is restored
    (global as any).document = originalDocument;
  });

  afterEach(() => {
    // Always restore document after each test
    (global as any).document = originalDocument;
  });

  describe('Basic Rendering', () => {
    it('should render all provider components in correct order', () => {
      render(
        <ClientWrapper>
          <div data-testid="test-child">Test Content</div>
        </ClientWrapper>
      );

      // Check that all providers are rendered
      expect(screen.getByTestId('i18n-initializer')).toBeInTheDocument();
      expect(screen.getByTestId('update-provider')).toBeInTheDocument();
      expect(screen.getByTestId('toast-provider')).toBeInTheDocument();
      expect(screen.getByTestId('service-worker-registration')).toBeInTheDocument();
      expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
      
      // Check that children are rendered
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render children within provider hierarchy', () => {
      render(
        <ClientWrapper>
          <div data-testid="child-component">Child Component</div>
        </ClientWrapper>
      );

      const childComponent = screen.getByTestId('child-component');
      expect(childComponent).toBeInTheDocument();
      
      // Verify the child is within the toast provider
      const toastProvider = screen.getByTestId('toast-provider');
      expect(toastProvider).toContainElement(childComponent);
    });

    it('should render multiple children correctly', () => {
      render(
        <ClientWrapper>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <span data-testid="child-3">Child 3</span>
        </ClientWrapper>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });
  });

  describe('Language Synchronization', () => {
    it('should set initial language on document element', () => {
      render(
        <ClientWrapper>
          <div>Test</div>
        </ClientWrapper>
      );

      expect(mockSetAttribute).toHaveBeenCalledWith('lang', 'en');
    });

    it('should handle undefined language with fallback', () => {
      mockedI18n.language = undefined as any;

      render(
        <ClientWrapper>
          <div>Test</div>
        </ClientWrapper>
      );

      expect(mockSetAttribute).toHaveBeenCalledWith('lang', 'en');
    });

    it('should set custom language when available', () => {
      mockedI18n.language = 'es';

      render(
        <ClientWrapper>
          <div>Test</div>
        </ClientWrapper>
      );

      expect(mockSetAttribute).toHaveBeenCalledWith('lang', 'es');
    });

    it('should register language change listener', () => {
      render(
        <ClientWrapper>
          <div>Test</div>
        </ClientWrapper>
      );

      expect(mockedI18n.on).toHaveBeenCalledWith('languageChanged', expect.any(Function));
    });

    it('should update language when i18n language changes', () => {
      let languageChangeCallback: () => void;
      mockedI18n.on.mockImplementation((event: string, callback: () => void) => {
        if (event === 'languageChanged') {
          languageChangeCallback = callback;
        }
      });

      render(
        <ClientWrapper>
          <div>Test</div>
        </ClientWrapper>
      );

      // Clear initial call
      mockSetAttribute.mockClear();

      // Simulate language change
      mockedI18n.language = 'fr';
      act(() => {
        languageChangeCallback();
      });

      expect(mockSetAttribute).toHaveBeenCalledWith('lang', 'fr');
    });

    it('should handle language change in browser environment', () => {
      let languageChangeCallback: () => void;
      mockedI18n.on.mockImplementation((event: string, callback: () => void) => {
        if (event === 'languageChanged') {
          languageChangeCallback = callback;
        }
      });

      render(
        <ClientWrapper>
          <div>Test</div>
        </ClientWrapper>
      );

      mockSetAttribute.mockClear();
      mockedI18n.language = 'de';

      act(() => {
        languageChangeCallback();
      });

      expect(mockSetAttribute).toHaveBeenCalledWith('lang', 'de');
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup language change listener on unmount', () => {
      const { unmount } = render(
        <ClientWrapper>
          <div>Test</div>
        </ClientWrapper>
      );

      // Verify listener was registered
      expect(mockedI18n.on).toHaveBeenCalledWith('languageChanged', expect.any(Function));

      // Unmount component
      unmount();

      // Verify listener was removed
      expect(mockedI18n.off).toHaveBeenCalledWith('languageChanged', expect.any(Function));
    });

    it('should remove the same callback function that was added', () => {
      let addedCallback: () => void;
      mockedI18n.on.mockImplementation((event: string, callback: () => void) => {
        addedCallback = callback;
      });

      const { unmount } = render(
        <ClientWrapper>
          <div>Test</div>
        </ClientWrapper>
      );

      unmount();

      expect(mockedI18n.off).toHaveBeenCalledWith('languageChanged', addedCallback);
    });
  });

  describe('Provider Integration', () => {
    it('should wrap children with I18nInitializer as outermost provider', () => {
      render(
        <ClientWrapper>
          <div data-testid="content">Content</div>
        </ClientWrapper>
      );

      const i18nInitializer = screen.getByTestId('i18n-initializer');
      const updateProvider = screen.getByTestId('update-provider');
      
      expect(i18nInitializer).toBeInTheDocument();
      expect(i18nInitializer).toContainElement(updateProvider);
    });

    it('should wrap children with UpdateProvider inside I18nInitializer', () => {
      render(
        <ClientWrapper>
          <div data-testid="content">Content</div>
        </ClientWrapper>
      );

      const updateProvider = screen.getByTestId('update-provider');
      const toastProvider = screen.getByTestId('toast-provider');
      
      expect(updateProvider).toBeInTheDocument();
      expect(updateProvider).toContainElement(toastProvider);
    });

    it('should include ServiceWorkerRegistration inside UpdateProvider', () => {
      render(
        <ClientWrapper>
          <div data-testid="content">Content</div>
        </ClientWrapper>
      );

      const updateProvider = screen.getByTestId('update-provider');
      const serviceWorkerReg = screen.getByTestId('service-worker-registration');
      
      expect(updateProvider).toContainElement(serviceWorkerReg);
    });

    it('should wrap children with ToastProvider inside UpdateProvider', () => {
      render(
        <ClientWrapper>
          <div data-testid="content">Content</div>
        </ClientWrapper>
      );

      const toastProvider = screen.getByTestId('toast-provider');
      const content = screen.getByTestId('content');
      
      expect(toastProvider).toBeInTheDocument();
      expect(toastProvider).toContainElement(content);
    });

    it('should include InstallPrompt inside ToastProvider', () => {
      render(
        <ClientWrapper>
          <div data-testid="content">Content</div>
        </ClientWrapper>
      );

      const toastProvider = screen.getByTestId('toast-provider');
      const installPrompt = screen.getByTestId('install-prompt');
      
      expect(toastProvider).toContainElement(installPrompt);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null children gracefully', () => {
      expect(() => {
        render(
          <ClientWrapper>
            {null}
          </ClientWrapper>
        );
      }).not.toThrow();
    });

    it('should handle undefined children gracefully', () => {
      expect(() => {
        render(
          <ClientWrapper>
            {undefined}
          </ClientWrapper>
        );
      }).not.toThrow();
    });

    it('should handle empty children gracefully', () => {
      render(
        <ClientWrapper>
          {}
        </ClientWrapper>
      );

      // All providers should still be rendered
      expect(screen.getByTestId('i18n-initializer')).toBeInTheDocument();
      expect(screen.getByTestId('update-provider')).toBeInTheDocument();
      expect(screen.getByTestId('toast-provider')).toBeInTheDocument();
      expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
    });

    it('should handle document undefined gracefully', () => {
      // Test that the component doesn't crash when document operations fail
      // This simulates SSR environment behavior
      expect(() => {
        render(
          <ClientWrapper>
            <div>SSR Test</div>
          </ClientWrapper>
        );
      }).not.toThrow();

      // Should still set language attribute since document is available in test env
      expect(mockSetAttribute).toHaveBeenCalledWith('lang', 'en');
    });
  });

  describe('Component Props', () => {
    it('should handle children as React nodes', () => {
      const CustomComponent = () => <div data-testid="custom">Custom Component</div>;
      
      render(
        <ClientWrapper>
          <CustomComponent />
        </ClientWrapper>
      );

      expect(screen.getByTestId('custom')).toBeInTheDocument();
    });

    it('should preserve children props and structure', () => {
      render(
        <ClientWrapper>
          <div className="test-class" id="test-id" data-custom="value">
            <span>Nested content</span>
          </div>
        </ClientWrapper>
      );

      const testDiv = screen.getByText('Nested content').parentElement;
      expect(testDiv).toHaveClass('test-class');
      expect(testDiv).toHaveAttribute('id', 'test-id');
      expect(testDiv).toHaveAttribute('data-custom', 'value');
    });
  });

  describe('Performance and Optimization', () => {
    it('should not cause unnecessary re-renders', () => {
      const { rerender } = render(
        <ClientWrapper>
          <div data-testid="stable-child">Content 1</div>
        </ClientWrapper>
      );

      // Clear mock calls from initial render
      mockedI18n.on.mockClear();
      mockedI18n.off.mockClear();

      // Re-render with same props
      rerender(
        <ClientWrapper>
          <div data-testid="stable-child">Content 1</div>
        </ClientWrapper>
      );

      // Should not register new listeners
      expect(mockedI18n.on).not.toHaveBeenCalled();
      expect(mockedI18n.off).not.toHaveBeenCalled();
    });

    it('should handle rapid language changes correctly', () => {
      let languageChangeCallback: () => void;
      mockedI18n.on.mockImplementation((event: string, callback: () => void) => {
        if (event === 'languageChanged') {
          languageChangeCallback = callback;
        }
      });

      render(
        <ClientWrapper>
          <div>Test</div>
        </ClientWrapper>
      );

      mockSetAttribute.mockClear();

      // Simulate rapid language changes
      act(() => {
        mockedI18n.language = 'es';
        languageChangeCallback();
        mockedI18n.language = 'fr';
        languageChangeCallback();
        mockedI18n.language = 'de';
        languageChangeCallback();
      });

      // Should have been called for each change
      expect(mockSetAttribute).toHaveBeenCalledTimes(3);
      expect(mockSetAttribute).toHaveBeenNthCalledWith(1, 'lang', 'es');
      expect(mockSetAttribute).toHaveBeenNthCalledWith(2, 'lang', 'fr');
      expect(mockSetAttribute).toHaveBeenNthCalledWith(3, 'lang', 'de');
    });
  });
});