/**
 * Error Sanitization Tests - Comprehensive Coverage
 * 
 * Tests for production error sanitization utility that prevents 
 * sensitive information disclosure through error messages.
 */

import {
  sanitizeError,
  createUserFriendlyError,
  sanitizeErrorForUI,
  safeConsoleError,
} from '../errorSanitization';

// Mock environment variables
const originalEnv = process.env.NODE_ENV;

describe('Error Sanitization Utilities', () => {
  // Mock console methods
  const originalConsoleError = console.error;
  let mockConsoleError: jest.Mock;

  beforeEach(() => {
    mockConsoleError = jest.fn();
    console.error = mockConsoleError;
  });

  afterEach(() => {
    console.error = originalConsoleError;
    process.env.NODE_ENV = originalEnv;
  });

  describe('sanitizeError', () => {
    describe('in development environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should preserve original error messages in development', () => {
        const error = new Error('Detailed development error message');
        const result = sanitizeError(error);

        expect(result.message).toBe('Detailed development error message');
        expect(result.type).toBe('Error');
        expect(result.timestamp).toBeDefined();
        expect(result.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      });

      it('should show detailed network errors in development', () => {
        const error = new Error('Failed to fetch from https://api.example.com');
        const result = sanitizeError(error);

        expect(result.message).toBe('Network/Database Error: Failed to fetch from https://api.example.com');
        expect(result.code).toBe('NETWORK_ERROR');
        expect(result.type).toBe('Error');
      });

      it('should show detailed storage errors in development', () => {
        const error = new Error('localStorage quota exceeded for /app/data');
        const result = sanitizeError(error);

        expect(result.message).toBe('Storage Error: localStorage quota exceeded for /app/data');
        expect(result.code).toBe('STORAGE_ERROR');
        expect(result.type).toBe('Error');
      });

      it('should preserve validation error details in development', () => {
        const error = new Error('Validation failed: email field is invalid');
        const result = sanitizeError(error);

        expect(result.message).toBe('Validation failed: email field is invalid');
        expect(result.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('in production environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should sanitize generic errors in production', () => {
        const error = new Error('Internal server details exposed');
        const result = sanitizeError(error);

        expect(result.message).toBe('An error occurred. Please try again.');
        expect(result.type).toBe('Error');
        expect(result.timestamp).toBeDefined();
        expect(result.requestId).toBeDefined();
      });

      it('should sanitize network errors in production', () => {
        const error = new Error('Connection failed to internal-db.company.com:5432');
        const result = sanitizeError(error);

        expect(result.message).toBe('A connection error occurred. Please check your internet connection and try again.');
        expect(result.code).toBe('NETWORK_ERROR');
      });

      it('should sanitize storage errors in production', () => {
        const error = new Error('localStorage write failed: /sensitive/path/data.json');
        const result = sanitizeError(error);

        expect(result.message).toBe('A storage error occurred. Please try again.');
        expect(result.code).toBe('STORAGE_ERROR');
      });

      it('should sanitize validation messages in production', () => {
        const error = new Error('Invalid data validation failed');
        const result = sanitizeError(error);

        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.message).toContain('validation');
      });
    });

    describe('network and database error detection', () => {
      const networkErrors = [
        'fetch failed',
        'Network request timeout', 
        'Connection refused',
        'Supabase connection error',
        'PostgreSQL error',
        'Database timeout',
        'CORS error',
      ];

      networkErrors.forEach(errorMessage => {
        it(`should detect "${errorMessage}" as network error`, () => {
          process.env.NODE_ENV = 'production';
          const error = new Error(errorMessage);
          const result = sanitizeError(error);

          expect(result.code).toBe('NETWORK_ERROR');
          expect(result.message).toBe('A connection error occurred. Please check your internet connection and try again.');
        });
      });

      it('should detect network errors by error name', () => {
        process.env.NODE_ENV = 'production';
        const error = new Error('Custom message');
        error.name = 'NetworkError';
        const result = sanitizeError(error);

        expect(result.code).toBe('NETWORK_ERROR');
      });

      it('should detect ECONNREFUSED as network error', () => {
        process.env.NODE_ENV = 'production';
        const error = new Error('Connection failed: ECONNREFUSED');
        const result = sanitizeError(error);

        expect(result.code).toBe('NETWORK_ERROR');
      });

      it('should detect ETIMEDOUT as network error', () => {
        process.env.NODE_ENV = 'production';
        const error = new Error('network ETIMEDOUT occurred');
        const result = sanitizeError(error);

        expect(result.code).toBe('NETWORK_ERROR');
      });

      it('should detect ENOTFOUND as network error', () => {
        process.env.NODE_ENV = 'production';
        const error = new Error('network ENOTFOUND error');
        const result = sanitizeError(error);

        expect(result.code).toBe('NETWORK_ERROR');
      });
    });

    describe('authentication error detection', () => {
      const authErrors = [
        'Authentication failed',
        'Login required',
        'Unauthorized access',
        'Forbidden resource',
        'Invalid token',
        'Session expired',
        'Bad credentials',
        'JWT malformed',
      ];

      authErrors.forEach(errorMessage => {
        it(`should detect "${errorMessage}" as auth error`, () => {
          const error = new Error(errorMessage);
          const result = sanitizeError(error);

          expect(result.code).toBe('AUTH_ERROR');
          expect(result.message).toBe('Authentication failed. Please check your credentials and try again.');
        });
      });

      it('should detect AuthenticationError by name', () => {
        const error = new Error('Custom message');
        error.name = 'AuthenticationError';
        const result = sanitizeError(error);

        expect(result.code).toBe('AUTH_ERROR');
      });
    });

    describe('validation error detection', () => {
      it('should detect ValidationError by name', () => {
        const error = new Error('Field validation failed');
        error.name = 'ValidationError';
        const result = sanitizeError(error);

        expect(result.code).toBe('VALIDATION_ERROR');
      });

      it('should detect validation errors by message content', () => {
        const validationMessages = [
          'Validation failed for field',
          'Invalid input provided',
        ];

        validationMessages.forEach(message => {
          const error = new Error(message);
          const result = sanitizeError(error);
          expect(result.code).toBe('VALIDATION_ERROR');
        });
      });
    });

    describe('storage error detection', () => {
      it('should detect StorageError by name', () => {
        const error = new Error('Storage operation failed');
        error.name = 'StorageError';
        const result = sanitizeError(error);

        expect(result.code).toBe('STORAGE_ERROR');
      });

      it('should detect storage errors by message content', () => {
        const storageMessages = [
          'Storage quota exceeded',
          'localStorage not available',
        ];

        storageMessages.forEach(message => {
          const error = new Error(message);
          const result = sanitizeError(error);
          expect(result.code).toBe('STORAGE_ERROR');
        });
      });
    });

    describe('non-Error objects', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should handle string errors', () => {
        const result = sanitizeError('Something went wrong');

        expect(result.message).toBe('An unexpected error occurred. Please try again.');
        expect(result.type).toBe('UnknownError');
      });

      it('should handle null errors', () => {
        const result = sanitizeError(null);

        expect(result.message).toBe('An unexpected error occurred. Please try again.');
        expect(result.type).toBe('UnknownError');
      });

      it('should handle object errors', () => {
        const result = sanitizeError({ error: 'custom error object' });

        expect(result.message).toBe('An unexpected error occurred. Please try again.');
        expect(result.type).toBe('UnknownError');
      });

      it('should show raw values in development', () => {
        process.env.NODE_ENV = 'development';
        const result = sanitizeError('Debug error string');

        expect(result.message).toBe('Debug error string');
      });
    });

    describe('context logging', () => {
      it('should log context when provided on server-side', () => {
        // Mock server environment (no window object)
        const originalWindow = (global as any).window;
        delete (global as any).window;

        const error = new Error('Test error');
        const context = {
          userId: 'user123',
          operation: 'saveGame',
          component: 'GameStore',
          additional: { gameId: 'game456' }
        };

        sanitizeError(error, context);

        // Should log on server-side (when window is undefined)
        expect(mockConsoleError).toHaveBeenCalledWith(
          '[ERROR_SANITIZER]',
          expect.objectContaining({
            error,
            context,
            timestamp: expect.any(String),
            requestId: expect.any(String),
            stack: expect.any(String)
          })
        );

        // Restore window
        (global as any).window = originalWindow;
      });

      it('should not log context on client-side', () => {
        // Ensure window exists (client-side)
        (global as any).window = {};

        const error = new Error('Test error');
        const context = { userId: 'user123' };

        sanitizeError(error, context);

        // Should not log on client-side
        expect(mockConsoleError).not.toHaveBeenCalledWith(
          '[ERROR_SANITIZER]',
          expect.anything()
        );
      });
    });

    describe('validation message sanitization', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should remove file paths from validation messages', () => {
        const error = new Error('Validation failed at /app/src/components/Form.tsx line 45');
        const result = sanitizeError(error);

        expect(result.message).toBe('Validation failed at [PATH_REMOVED] line 45');
      });

      it('should remove UUIDs from validation messages', () => {
        const error = new Error('Invalid ID: 550e8400-e29b-41d4-a716-446655440000');
        const result = sanitizeError(error);

        expect(result.message).toBe('Invalid ID: [ID_REMOVED]');
      });

      it('should remove email addresses from validation messages', () => {
        const error = new Error('Invalid email: john.doe@company.com');
        const result = sanitizeError(error);

        expect(result.message).toBe('Invalid email: [EMAIL_REMOVED]');
      });

      it('should handle multiple sensitive patterns', () => {
        const error = new Error('Field validation error: user@test.com at /app/form.ts with ID 123e4567-e89b-12d3-a456-426614174000');
        error.name = 'ValidationError'; // Ensure it's detected as validation error
        const result = sanitizeError(error);

        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.message).toBe('Field validation error: [EMAIL_REMOVED] at [PATH_REMOVED] with ID [ID_REMOVED]');
      });
    });
  });

  describe('createUserFriendlyError', () => {
    it('should create network error', () => {
      const result = createUserFriendlyError('network');

      expect(result.message).toBe('Connection problem. Please check your internet and try again.');
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.type).toBe('UserFriendlyError');
      expect(result.timestamp).toBeDefined();
      expect(result.requestId).toBeDefined();
    });

    it('should create auth error', () => {
      const result = createUserFriendlyError('auth');

      expect(result.message).toBe('Please sign in again to continue.');
      expect(result.code).toBe('AUTH_ERROR');
    });

    it('should create validation error with custom details', () => {
      const result = createUserFriendlyError('validation', 'Name is required');

      expect(result.message).toBe('Name is required');
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should create validation error with default message', () => {
      const result = createUserFriendlyError('validation');

      expect(result.message).toBe('Please check your input and try again.');
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should create storage error', () => {
      const result = createUserFriendlyError('storage');

      expect(result.message).toBe('Unable to save data. Please try again.');
      expect(result.code).toBe('STORAGE_ERROR');
    });

    it('should create unknown error', () => {
      const result = createUserFriendlyError('unknown');

      expect(result.message).toBe('Something went wrong. Please try again.');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('sanitizeErrorForUI', () => {
    it('should return fallback message in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal server error');
      const result = sanitizeErrorForUI(error, 'Custom fallback message');

      expect(result).toBe('Custom fallback message');
    });

    it('should return default fallback in production without custom message', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal server error');
      const result = sanitizeErrorForUI(error);

      expect(result).toBe('Something went wrong. Please refresh and try again.');
    });

    it('should return sanitized message in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Detailed error for debugging');
      const result = sanitizeErrorForUI(error);

      expect(result).toBe('Detailed error for debugging');
    });

    it('should handle non-Error objects', () => {
      process.env.NODE_ENV = 'development';
      const result = sanitizeErrorForUI('String error');

      expect(result).toBe('String error');
    });
  });

  describe('safeConsoleError', () => {
    it('should log full details in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Development error');
      const context = { userId: 'user123', operation: 'test' };

      safeConsoleError(error, context);

      expect(mockConsoleError).toHaveBeenCalledWith('[DEBUG_ERROR]', error, context);
    });

    it('should log sanitized details in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Production error with sensitive data');
      const context = { userId: 'user123', operation: 'test' };

      safeConsoleError(error, context);

      expect(mockConsoleError).toHaveBeenCalledWith('[PROD_ERROR]', {
        message: 'An error occurred. Please try again.',
        type: 'Error',
        code: undefined,
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle context-free errors', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Simple error');

      safeConsoleError(error);

      expect(mockConsoleError).toHaveBeenCalledWith('[DEBUG_ERROR]', error, undefined);
    });

    it('should handle non-Error objects in production', () => {
      process.env.NODE_ENV = 'production';
      const error = 'String error';

      safeConsoleError(error);

      expect(mockConsoleError).toHaveBeenCalledWith('[PROD_ERROR]', {
        message: 'An unexpected error occurred. Please try again.',
        type: 'UnknownError',
        code: undefined,
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });
  });

  describe('request ID generation', () => {
    it('should generate unique request IDs', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      const result1 = sanitizeError(error1);
      const result2 = sanitizeError(error2);

      expect(result1.requestId).toBeDefined();
      expect(result2.requestId).toBeDefined();
      expect(result1.requestId).not.toBe(result2.requestId);

      // Check format
      expect(result1.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(result2.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe('edge cases and error boundaries', () => {
    it('should handle errors with custom constructors', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error message');
      const result = sanitizeError(error);

      expect(result.type).toBe('CustomError');
    });

    it('should handle errors without messages', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error();
      const result = sanitizeError(error);

      expect(result.message).toBe('An error occurred. Please try again.');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new Error(longMessage);
      const result = sanitizeError(error);

      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe('string');
    });

    it('should handle circular reference objects', () => {
      const obj: any = { message: 'Circular error' };
      obj.self = obj;

      expect(() => sanitizeError(obj)).not.toThrow();
      const result = sanitizeError(obj);
      expect(result.type).toBe('UnknownError');
    });

    it('should preserve timestamps as ISO strings', () => {
      const error = new Error('Test error');
      const result = sanitizeError(error);

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
    });
  });
});