import {
  AuthorizationError,
  requireAuthentication,
  requireOwnership,
  requireCreatePermission,
  requireReadPermission,
  requireUpdatePermission,
  requireDeletePermission,
  AuthorizationWrapper,
  validateArrayOwnership,
  filterByOwnership,
  checkAuthorization,
  withAuthorization,
  createLocalStorageAuthContext,
} from '../authorizationChecks';

describe('authorizationChecks', () => {
  describe('AuthorizationError', () => {
    it('should create error with message', () => {
      const error = new AuthorizationError('Access denied');
      expect(error.message).toBe('Access denied');
      expect(error.name).toBe('AuthorizationError');
      expect(error.operation).toBeUndefined();
      expect(error.resource).toBeUndefined();
    });

    it('should create error with operation and resource', () => {
      const error = new AuthorizationError('Access denied', 'read', 'game');
      expect(error.message).toBe('Access denied');
      expect(error.operation).toBe('read');
      expect(error.resource).toBe('game');
    });
  });

  describe('requireAuthentication', () => {
    it('should return userId when valid', () => {
      expect(requireAuthentication('user123')).toBe('user123');
    });

    it('should throw for null userId', () => {
      expect(() => requireAuthentication(null)).toThrow(AuthorizationError);
      expect(() => requireAuthentication(null)).toThrow('Authentication required');
    });

    it('should throw for undefined userId', () => {
      expect(() => requireAuthentication(undefined)).toThrow(AuthorizationError);
    });

    it('should throw for empty string userId', () => {
      expect(() => requireAuthentication('')).toThrow(AuthorizationError);
    });

    it('should throw for whitespace-only userId', () => {
      expect(() => requireAuthentication('   ')).toThrow(AuthorizationError);
    });
  });

  describe('requireOwnership', () => {
    it('should pass when user owns resource', () => {
      expect(() => requireOwnership('user123', 'user123')).not.toThrow();
    });

    it('should throw when resource belongs to different user', () => {
      expect(() => requireOwnership('user123', 'user456')).toThrow(AuthorizationError);
      expect(() => requireOwnership('user123', 'user456')).toThrow('Access denied');
    });

    it('should throw when current user is not authenticated', () => {
      expect(() => requireOwnership('user123', null)).toThrow(AuthorizationError);
    });

    it('should throw when resource has no owner', () => {
      expect(() => requireOwnership(null, 'user123')).toThrow(AuthorizationError);
    });

    it('should use custom resource type in error message', () => {
      expect(() => requireOwnership('user123', 'user456', 'game')).toThrow('game');
    });
  });

  describe('permission functions', () => {
    describe('requireCreatePermission', () => {
      it('should return userId for authenticated user', () => {
        expect(requireCreatePermission('user123')).toBe('user123');
      });

      it('should throw for unauthenticated user', () => {
        expect(() => requireCreatePermission(null)).toThrow(AuthorizationError);
      });
    });

    describe('requireReadPermission', () => {
      it('should pass when user owns resource', () => {
        expect(() => requireReadPermission('user123', 'user123')).not.toThrow();
      });

      it('should throw when user does not own resource', () => {
        expect(() => requireReadPermission('user123', 'user456')).toThrow(AuthorizationError);
      });
    });

    describe('requireUpdatePermission', () => {
      it('should pass when user owns resource', () => {
        expect(() => requireUpdatePermission('user123', 'user123')).not.toThrow();
      });

      it('should throw when user does not own resource', () => {
        expect(() => requireUpdatePermission('user123', 'user456')).toThrow(AuthorizationError);
      });
    });

    describe('requireDeletePermission', () => {
      it('should pass when user owns resource', () => {
        expect(() => requireDeletePermission('user123', 'user123')).not.toThrow();
      });

      it('should throw when user does not own resource', () => {
        expect(() => requireDeletePermission('user123', 'user456')).toThrow(AuthorizationError);
      });
    });
  });

  describe('AuthorizationWrapper', () => {
    let wrapper: AuthorizationWrapper;
    let mockGetCurrentUserId: jest.Mock;

    beforeEach(() => {
      mockGetCurrentUserId = jest.fn();
      wrapper = new AuthorizationWrapper(mockGetCurrentUserId);
    });

    describe('authorizeCreate', () => {
      it('should execute operation with authenticated user', async () => {
        mockGetCurrentUserId.mockResolvedValue('user123');
        const operation = jest.fn().mockResolvedValue('result');

        const result = await wrapper.authorizeCreate(operation);

        expect(result).toBe('result');
        expect(operation).toHaveBeenCalledWith('user123');
      });

      it('should throw when user is not authenticated', async () => {
        mockGetCurrentUserId.mockResolvedValue(null);
        const operation = jest.fn();

        await expect(wrapper.authorizeCreate(operation)).rejects.toThrow(AuthorizationError);
        expect(operation).not.toHaveBeenCalled();
      });

      it('should wrap non-auth errors in AuthorizationError', async () => {
        mockGetCurrentUserId.mockResolvedValue('user123');
        const operation = jest.fn().mockRejectedValue(new Error('Database error'));

        await expect(wrapper.authorizeCreate(operation, 'game')).rejects.toThrow(AuthorizationError);
        await expect(wrapper.authorizeCreate(operation, 'game')).rejects.toThrow('game creation');
      });
    });

    describe('authorizeRead', () => {
      it('should execute operation and validate ownership', async () => {
        mockGetCurrentUserId.mockResolvedValue('user123');
        const operation = jest.fn().mockResolvedValue({ data: 'test' });
        const validateOwnership = jest.fn();

        const result = await wrapper.authorizeRead(operation, validateOwnership);

        expect(result).toEqual({ data: 'test' });
        expect(operation).toHaveBeenCalled();
        expect(validateOwnership).toHaveBeenCalledWith({ data: 'test' }, 'user123');
      });

      it('should throw when user is not authenticated', async () => {
        mockGetCurrentUserId.mockResolvedValue(null);
        const operation = jest.fn();
        const validateOwnership = jest.fn();

        await expect(wrapper.authorizeRead(operation, validateOwnership)).rejects.toThrow(AuthorizationError);
      });
    });

    describe('authorizeUpdate', () => {
      it('should execute operation when user owns resource', async () => {
        mockGetCurrentUserId.mockResolvedValue('user123');
        const operation = jest.fn().mockResolvedValue('updated');

        const result = await wrapper.authorizeUpdate(operation, 'user123');

        expect(result).toBe('updated');
        expect(operation).toHaveBeenCalledWith('user123');
      });

      it('should throw when user does not own resource', async () => {
        mockGetCurrentUserId.mockResolvedValue('user123');
        const operation = jest.fn();

        await expect(wrapper.authorizeUpdate(operation, 'user456')).rejects.toThrow(AuthorizationError);
        expect(operation).not.toHaveBeenCalled();
      });
    });

    describe('authorizeDelete', () => {
      it('should execute operation when user owns resource', async () => {
        mockGetCurrentUserId.mockResolvedValue('user123');
        const operation = jest.fn().mockResolvedValue('deleted');

        const result = await wrapper.authorizeDelete(operation, 'user123');

        expect(result).toBe('deleted');
        expect(operation).toHaveBeenCalledWith('user123');
      });

      it('should throw when user does not own resource', async () => {
        mockGetCurrentUserId.mockResolvedValue('user123');
        const operation = jest.fn();

        await expect(wrapper.authorizeDelete(operation, 'user456')).rejects.toThrow(AuthorizationError);
        expect(operation).not.toHaveBeenCalled();
      });
    });
  });

  describe('validateArrayOwnership', () => {
    const validResources = [
      { id: '1', user_id: 'user123' },
      { id: '2', user_id: 'user123' },
    ];

    const mixedResources = [
      { id: '1', user_id: 'user123' },
      { id: '2', user_id: 'user456' },
      { id: '3', user_id: 'user123' },
    ];

    it('should pass when all resources belong to user', () => {
      expect(() => validateArrayOwnership(validResources, 'user123')).not.toThrow();
    });

    it('should throw when some resources belong to other users', () => {
      expect(() => validateArrayOwnership(mixedResources, 'user123')).toThrow(AuthorizationError);
      expect(() => validateArrayOwnership(mixedResources, 'user123')).toThrow('Found 1 unauthorized');
    });

    it('should handle resources without user_id', () => {
      const resourcesWithoutUserId = [
        { id: '1' },
        { id: '2', user_id: 'user123' },
      ];
      expect(() => validateArrayOwnership(resourcesWithoutUserId, 'user123')).not.toThrow();
    });

    it('should use custom resource type in error message', () => {
      expect(() => validateArrayOwnership(mixedResources, 'user123', 'games')).toThrow('games');
    });
  });

  describe('filterByOwnership', () => {
    const resources = [
      { id: '1', user_id: 'user123' },
      { id: '2', user_id: 'user456' },
      { id: '3', user_id: 'user123' },
      { id: '4' }, // no user_id
    ];

    it('should return only resources belonging to user', () => {
      const filtered = filterByOwnership(resources, 'user123');
      expect(filtered).toHaveLength(3);
      expect(filtered.map(r => r.id)).toEqual(['1', '3', '4']);
    });

    it('should return empty array when no resources belong to user', () => {
      const filtered = filterByOwnership(resources, 'user999');
      expect(filtered).toEqual([{ id: '4' }]);
    });

    it('should include resources without user_id', () => {
      const filtered = filterByOwnership([{ id: '1' }], 'user123');
      expect(filtered).toEqual([{ id: '1' }]);
    });
  });

  describe('checkAuthorization', () => {
    it('should return authorized true when user owns resource', () => {
      const result = checkAuthorization('user123', 'user123');
      expect(result.authorized).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return authorized false when user does not own resource', () => {
      const result = checkAuthorization('user123', 'user456');
      expect(result.authorized).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return authorized false when user is not authenticated', () => {
      const result = checkAuthorization('user123', null);
      expect(result.authorized).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('withAuthorization', () => {
    it('should execute operation when user is authenticated', async () => {
      const operation = jest.fn().mockResolvedValue('result');
      const getUserId = jest.fn().mockResolvedValue('user123');

      const authorizedOperation = withAuthorization(operation, getUserId);
      const result = await authorizedOperation('arg1', 'arg2');

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should throw when user is not authenticated', async () => {
      const operation = jest.fn();
      const getUserId = jest.fn().mockResolvedValue(null);

      const authorizedOperation = withAuthorization(operation, getUserId);

      await expect(authorizedOperation()).rejects.toThrow(AuthorizationError);
      expect(operation).not.toHaveBeenCalled();
    });

    it('should wrap operation errors in AuthorizationError', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Database error'));
      const getUserId = jest.fn().mockResolvedValue('user123');

      const authorizedOperation = withAuthorization(operation, getUserId, 'game');

      await expect(authorizedOperation()).rejects.toThrow(AuthorizationError);
    });
  });

  describe('createLocalStorageAuthContext', () => {
    let authContext: ReturnType<typeof createLocalStorageAuthContext>;
    let mockGetCurrentUserId: jest.Mock;

    beforeEach(() => {
      mockGetCurrentUserId = jest.fn();
      authContext = createLocalStorageAuthContext(mockGetCurrentUserId);
    });

    describe('requireAuth', () => {
      it('should return userId when authenticated', () => {
        mockGetCurrentUserId.mockReturnValue('user123');
        expect(authContext.requireAuth()).toBe('user123');
      });

      it('should throw when not authenticated', () => {
        mockGetCurrentUserId.mockReturnValue(null);
        expect(() => authContext.requireAuth()).toThrow(AuthorizationError);
      });
    });

    describe('checkOwnership', () => {
      it('should pass when user owns resource', () => {
        mockGetCurrentUserId.mockReturnValue('user123');
        expect(() => authContext.checkOwnership('user123')).not.toThrow();
      });

      it('should throw when user does not own resource', () => {
        mockGetCurrentUserId.mockReturnValue('user123');
        expect(() => authContext.checkOwnership('user456')).toThrow(AuthorizationError);
      });
    });

    describe('filterUserData', () => {
      const data = [
        { id: '1', user_id: 'user123' },
        { id: '2', user_id: 'user456' },
        { id: '3', user_id: 'user123' },
      ];

      it('should return filtered data for authenticated user', () => {
        mockGetCurrentUserId.mockReturnValue('user123');
        const filtered = authContext.filterUserData(data);
        expect(filtered).toHaveLength(2);
        expect(filtered.map(item => item.id)).toEqual(['1', '3']);
      });

      it('should return empty array when not authenticated', () => {
        mockGetCurrentUserId.mockReturnValue(null);
        const filtered = authContext.filterUserData(data);
        expect(filtered).toEqual([]);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent authorization checks', async () => {
      const wrapper = new AuthorizationWrapper(async () => 'user123');
      const operation = jest.fn().mockResolvedValue('result');

      const promises = Array.from({ length: 10 }, () => 
        wrapper.authorizeCreate(operation)
      );

      const results = await Promise.all(promises);
      expect(results.every(r => r === 'result')).toBe(true);
      expect(operation).toHaveBeenCalledTimes(10);
    });

    it('should handle getUserId failures in wrapper', async () => {
      const wrapper = new AuthorizationWrapper(async () => {
        throw new Error('Auth service down');
      });
      const operation = jest.fn();

      await expect(wrapper.authorizeCreate(operation)).rejects.toThrow(AuthorizationError);
    });

    it('should preserve AuthorizationError through wrapper methods', async () => {
      const wrapper = new AuthorizationWrapper(async () => 'user123');
      const operation = jest.fn().mockRejectedValue(
        new AuthorizationError('Custom auth error', 'test', 'resource')
      );

      const error = await wrapper.authorizeCreate(operation).catch(e => e);
      
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.message).toBe('Custom auth error');
      expect(error.operation).toBe('test');
      expect(error.resource).toBe('resource');
    });
  });
});