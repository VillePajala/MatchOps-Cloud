import { isAuthenticationError, shouldRetryOnError } from '../authErrorUtils';

describe('authErrorUtils', () => {
  describe('isAuthenticationError', () => {
    it('should return true for 401 error messages', () => {
      const error = new Error('Request failed with status 401');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return true for 403 error messages', () => {
      const error = new Error('Request failed with status 403');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return true for Unauthorized error messages', () => {
      const error = new Error('Unauthorized access');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return true for Forbidden error messages', () => {
      const error = new Error('Forbidden resource');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return true for AuthenticationError in message', () => {
      const error = new Error('AuthenticationError: Invalid credentials');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return true for AuthenticationError as error name', () => {
      const error = new Error('Invalid token');
      error.name = 'AuthenticationError';
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return true for string errors containing 401', () => {
      expect(isAuthenticationError('401 Unauthorized')).toBe(true);
    });

    it('should return true for string errors containing 403', () => {
      expect(isAuthenticationError('403 Forbidden')).toBe(true);
    });

    it('should return true for string errors containing Unauthorized', () => {
      expect(isAuthenticationError('Unauthorized request')).toBe(true);
    });

    it('should return true for string errors containing Forbidden', () => {
      expect(isAuthenticationError('Access Forbidden')).toBe(true);
    });

    it('should return true for string errors containing AuthenticationError', () => {
      expect(isAuthenticationError('AuthenticationError occurred')).toBe(true);
    });

    it('should return false for non-authentication errors', () => {
      const error = new Error('Network error');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('should return false for 500 errors', () => {
      const error = new Error('Internal server error 500');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isAuthenticationError(null)).toBe(false);
      expect(isAuthenticationError(undefined)).toBe(false);
    });

    it('should handle non-Error objects', () => {
      expect(isAuthenticationError({ message: '401 error' })).toBe(false);
      expect(isAuthenticationError({ message: 'Network error' })).toBe(false);
    });

    it('should handle number errors', () => {
      expect(isAuthenticationError(401)).toBe(true);
      expect(isAuthenticationError(403)).toBe(true);
      expect(isAuthenticationError(500)).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(isAuthenticationError('unauthorized')).toBe(false);
      expect(isAuthenticationError('UNAUTHORIZED')).toBe(false);
      expect(isAuthenticationError('Unauthorized')).toBe(true);
    });
  });

  describe('shouldRetryOnError', () => {
    it('should return false for authentication errors (401)', () => {
      const error = new Error('401 Unauthorized');
      expect(shouldRetryOnError(error)).toBe(false);
    });

    it('should return false for authentication errors (403)', () => {
      const error = new Error('403 Forbidden');
      expect(shouldRetryOnError(error)).toBe(false);
    });

    it('should return false for Unauthorized errors', () => {
      const error = new Error('Unauthorized access');
      expect(shouldRetryOnError(error)).toBe(false);
    });

    it('should return false for Forbidden errors', () => {
      const error = new Error('Forbidden resource');
      expect(shouldRetryOnError(error)).toBe(false);
    });

    it('should return false for AuthenticationError', () => {
      const error = new Error('Invalid credentials');
      error.name = 'AuthenticationError';
      expect(shouldRetryOnError(error)).toBe(false);
    });

    it('should return true for network errors', () => {
      const error = new Error('Network error');
      expect(shouldRetryOnError(error)).toBe(true);
    });

    it('should return true for 500 errors', () => {
      const error = new Error('Internal server error 500');
      expect(shouldRetryOnError(error)).toBe(true);
    });

    it('should return true for timeout errors', () => {
      const error = new Error('Request timeout');
      expect(shouldRetryOnError(error)).toBe(true);
    });

    it('should return true for generic errors', () => {
      const error = new Error('Something went wrong');
      expect(shouldRetryOnError(error)).toBe(true);
    });

    it('should return true for string errors that are not auth errors', () => {
      expect(shouldRetryOnError('Database connection failed')).toBe(true);
    });

    it('should return false for string auth errors', () => {
      expect(shouldRetryOnError('401 error occurred')).toBe(false);
    });

    it('should handle null/undefined errors', () => {
      expect(shouldRetryOnError(null)).toBe(true);
      expect(shouldRetryOnError(undefined)).toBe(true);
    });

    it('should handle non-Error objects', () => {
      expect(shouldRetryOnError({ code: 500 })).toBe(true);
      expect(shouldRetryOnError({ message: '401' })).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle errors with both name and message containing auth indicators', () => {
      const error = new Error('401 Unauthorized');
      error.name = 'AuthenticationError';
      expect(isAuthenticationError(error)).toBe(true);
      expect(shouldRetryOnError(error)).toBe(false);
    });

    it('should handle errors with partial matches', () => {
      expect(isAuthenticationError('User is not authorized')).toBe(false);
      expect(isAuthenticationError('This is unauthorized access')).toBe(false);
      expect(isAuthenticationError('Unauthorized')).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(isAuthenticationError('')).toBe(false);
      expect(shouldRetryOnError('')).toBe(true);
    });

    it('should handle boolean values', () => {
      expect(isAuthenticationError(true)).toBe(false);
      expect(isAuthenticationError(false)).toBe(false);
      expect(shouldRetryOnError(true)).toBe(true);
      expect(shouldRetryOnError(false)).toBe(true);
    });
  });
});