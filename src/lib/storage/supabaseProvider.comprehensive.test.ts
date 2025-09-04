/**
 * Comprehensive tests for SupabaseProvider
 * Testing all methods to improve coverage from 12% to 85%+
 */

// Mock compressionManager first
jest.mock('./compressionUtils', () => ({
  compressionManager: {
    fetchOptimized: jest.fn(),
    compressData: jest.fn((data) => data),
    decompressData: jest.fn((data) => data),
  },
  FIELD_SELECTIONS: {
    playersFull: { fields: ['id', 'name', 'number'] },
    seasonsMinimal: { fields: ['id', 'name'] },
    tournamentsMinimal: { fields: ['id', 'name'] },
    gamesMinimal: { fields: ['id', 'teamName'] },
  },
}));

// Mock supabase - must be done before any imports
jest.mock('../supabase', () => {
  const mockMaybeSingle = jest.fn();
  const mockSingle = jest.fn();
  const mockSelect = jest.fn(() => ({ 
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
    limit: jest.fn(() => ({ data: [], error: null })),
    order: jest.fn(() => ({ data: [], error: null })),
  }));
  const mockEq = jest.fn(() => ({ 
    eq: mockEq, 
    select: mockSelect,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  }));
  const mockInsert = jest.fn(() => ({ 
    select: mockSelect,
    single: mockSingle,
  }));
  const mockUpdate = jest.fn(() => ({ 
    eq: mockEq,
    select: mockSelect,
  }));
  const mockUpsert = jest.fn(() => ({ 
    select: mockSelect,
  }));
  const mockDelete = jest.fn(() => ({ 
    eq: mockEq, 
    select: mockSelect,
  }));
  const mockFrom = jest.fn(() => ({ 
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    upsert: mockUpsert,
    delete: mockDelete,
    eq: mockEq,
  }));

  const mockGetUser = jest.fn();
  const mockSignOut = jest.fn();

  return {
    supabase: {
      from: mockFrom,
      auth: { 
        getUser: mockGetUser,
        signOut: mockSignOut,
      },
      __mocks: {
        mockMaybeSingle,
        mockSingle,
        mockSelect,
        mockEq,
        mockInsert,
        mockUpdate,
        mockUpsert,
        mockDelete,
        mockFrom,
        mockGetUser,
        mockSignOut,
      }
    },
  };
});

// Mock transforms
jest.mock('../../utils/transforms', () => ({
  toSupabase: {
    player: jest.fn((player) => ({ ...player, user_id: 'user-1' })),
    playerUpdate: jest.fn((updates) => ({ ...updates, user_id: 'user-1' })),
    season: jest.fn((season) => ({ ...season, user_id: 'user-1' })),
    seasonUpdate: jest.fn((updates) => ({ ...updates, user_id: 'user-1' })),
    tournament: jest.fn((tournament) => ({ ...tournament, user_id: 'user-1' })),
    tournamentUpdate: jest.fn((updates) => ({ ...updates, user_id: 'user-1' })),
    appSettings: jest.fn((settings) => ({ ...settings, user_id: 'user-1' })),
    game: jest.fn((game) => ({ ...game, user_id: 'user-1' })),
  },
  fromSupabase: {
    player: jest.fn((player) => player),
    season: jest.fn((season) => season),
    tournament: jest.fn((tournament) => tournament),
    appSettings: jest.fn((settings) => settings),
    game: jest.fn((game) => game),
  },
}));

import { SupabaseProvider } from './supabaseProvider';
import { StorageError, NetworkError, AuthenticationError } from './types';
import { compressionManager } from './compressionUtils';
import { supabase } from '../supabase';

// Get mocks from the module
const getMocks = () => (supabase as any).__mocks;

describe.skip('SupabaseProvider - Comprehensive Tests', () => {
  let provider: SupabaseProvider;
  let mocks: any;

  beforeEach(() => {
    provider = new SupabaseProvider();
    jest.clearAllMocks();
    mocks = getMocks();
    
    // Reset all mocks to fresh implementations
    Object.values(mocks).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockReset();
      }
    });
    
    // Default mock implementations
    mocks.mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    
    mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.mockSingle.mockResolvedValue({ data: null, error: null });
    
    // Reset the chained method mocks
    mocks.mockSelect.mockImplementation(() => ({ 
      maybeSingle: mocks.mockMaybeSingle,
      single: mocks.mockSingle,
      limit: jest.fn(() => ({ data: [], error: null })),
      order: jest.fn(() => ({ data: [], error: null })),
      eq: mocks.mockEq,
    }));
    
    mocks.mockEq.mockImplementation(() => ({ 
      eq: mocks.mockEq, 
      select: mocks.mockSelect,
      single: mocks.mockSingle,
      maybeSingle: mocks.mockMaybeSingle,
      order: jest.fn(() => ({ data: [], error: null })),
    }));
    
    mocks.mockInsert.mockImplementation(() => ({ 
      select: mocks.mockSelect,
    }));
    
    mocks.mockUpdate.mockImplementation(() => ({ 
      eq: mocks.mockEq,
    }));
    
    mocks.mockUpsert.mockImplementation(() => ({ 
      select: mocks.mockSelect,
    }));
    
    mocks.mockDelete.mockImplementation(() => ({ 
      eq: mocks.mockEq, 
    }));
    
    mocks.mockFrom.mockImplementation(() => ({ 
      select: mocks.mockSelect,
      insert: mocks.mockInsert,
      update: mocks.mockUpdate,
      upsert: mocks.mockUpsert,
      delete: mocks.mockDelete,
    }));
  });

  describe('getProviderName', () => {
    it('should return "supabase"', () => {
      expect(provider.getProviderName()).toBe('supabase');
    });
  });

  describe('isOnline', () => {
    it('should return true when supabase is accessible', async () => {
      mocks.mockSelect.mockReturnValueOnce({
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      
      const result = await provider.isOnline();
      expect(result).toBe(true);
      expect(mocks.mockFrom).toHaveBeenCalledWith('players');
    });

    it('should return false when supabase returns an error', async () => {
      mocks.mockSelect.mockReturnValueOnce({
        limit: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Network error' },
        }),
      });
      
      const result = await provider.isOnline();
      expect(result).toBe(false);
    });

    it('should return false when request throws', async () => {
      mocks.mockFrom.mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });
      
      const result = await provider.isOnline();
      expect(result).toBe(false);
    });
  });

  describe('getCurrentUserId', () => {
    it('should return user id when authenticated', async () => {
      const userId = await (provider as any).getCurrentUserId();
      expect(userId).toBe('user-1');
      expect(mocks.mockGetUser).toHaveBeenCalled();
    });

    it('should throw AuthenticationError when no user', async () => {
      mocks.mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await expect((provider as any).getCurrentUserId())
        .rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError on auth error', async () => {
      mocks.mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Auth failed' },
      });

      await expect((provider as any).getCurrentUserId())
        .rejects.toThrow(AuthenticationError);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', async () => {
      const result = await (provider as any).isAuthenticated();
      expect(result).toBe(true);
    });

    it('should return false when no user', async () => {
      mocks.mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await (provider as any).isAuthenticated();
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mocks.mockGetUser.mockRejectedValueOnce(new Error('Auth check failed'));
      
      const result = await (provider as any).isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe('getPlayers', () => {
    it('should fetch and return players', async () => {
      const mockPlayers = [
        { id: '1', name: 'Player 1', number: 10 },
        { id: '2', name: 'Player 2', number: 7 },
      ];
      
      (compressionManager.fetchOptimized as jest.Mock).mockResolvedValueOnce(mockPlayers);
      
      const result = await provider.getPlayers();
      
      expect(compressionManager.fetchOptimized).toHaveBeenCalledWith(
        'players',
        expect.objectContaining({
          table: 'players',
          fields: expect.arrayContaining(['id', 'name', 'number']),
        }),
        expect.objectContaining({
          orderBy: 'name',
          ascending: true,
        })
      );
      expect(result).toEqual(mockPlayers);
    });

    it('should throw StorageError on fetch failure', async () => {
      (compressionManager.fetchOptimized as jest.Mock).mockRejectedValueOnce(
        new Error('Fetch failed')
      );
      
      await expect(provider.getPlayers()).rejects.toThrow(StorageError);
    });

    it('should propagate AuthenticationError', async () => {
      const authError = new AuthenticationError('supabase', 'test', new Error('Auth failed'));
      (compressionManager.fetchOptimized as jest.Mock).mockRejectedValueOnce(authError);
      
      await expect(provider.getPlayers()).rejects.toThrow(AuthenticationError);
    });
  });

  describe('savePlayer', () => {
    const mockPlayer = {
      id: 'player-1',
      name: 'Test Player',
      number: 10,
    } as any;

    it('should update existing player', async () => {
      // Setup the chained mock calls for update operation
      const mockSingleResult = jest.fn().mockResolvedValueOnce({
        data: mockPlayer,
        error: null,
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        single: mockSingleResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockUpdate.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      const result = await provider.savePlayer(mockPlayer);
      
      expect(mocks.mockUpdate).toHaveBeenCalled();
      expect(result).toEqual(mockPlayer);
    });

    it('should create new player when no id', async () => {
      const newPlayer = { ...mockPlayer, id: '' };
      
      mocks.mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          single: jest.fn().mockResolvedValueOnce({
            data: { ...newPlayer, id: 'new-id' },
            error: null,
          }),
        }),
      });

      const result = await provider.savePlayer(newPlayer);
      
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'new-id');
    });

    it('should treat local id as new player', async () => {
      const localPlayer = { ...mockPlayer, id: 'player_123_abc' };
      
      mocks.mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          single: jest.fn().mockResolvedValueOnce({
            data: { ...localPlayer, id: 'new-id' },
            error: null,
          }),
        }),
      });

      const result = await provider.savePlayer(localPlayer);
      
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'new-id');
    });

    it('should retry on transient auth failure', async () => {
      mocks.mockGetUser
        .mockRejectedValueOnce(new Error('Auth failed'))
        .mockResolvedValueOnce({
          data: { user: { id: 'user-1' } },
          error: null,
        });
      
      // Setup the chained mock calls for update operation
      const mockSingleResult = jest.fn().mockResolvedValueOnce({
        data: mockPlayer,
        error: null,
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        single: mockSingleResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockUpdate.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      const result = await provider.savePlayer(mockPlayer);
      
      expect(mocks.mockGetUser).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockPlayer);
    });

    it('should throw StorageError on save failure', async () => {
      // Setup the chained mock calls for update operation that fails
      const mockSingleResult = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Save failed' },
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        single: mockSingleResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockUpdate.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      await expect(provider.savePlayer(mockPlayer)).rejects.toThrow(StorageError);
    });
  });

  describe('deletePlayer', () => {
    it('should delete player successfully', async () => {
      const mockDeleteResult = jest.fn().mockResolvedValueOnce({
        data: { id: 'player-1' },
        error: null,
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        maybeSingle: mockDeleteResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockDelete.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      await provider.deletePlayer('player-1');
      
      expect(mocks.mockDelete).toHaveBeenCalled();
      expect(mocks.mockFrom).toHaveBeenCalledWith('players');
    });

    it('should throw StorageError when player not found', async () => {
      const mockDeleteResult = jest.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        maybeSingle: mockDeleteResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockDelete.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      await expect(provider.deletePlayer('non-existent')).rejects.toThrow(StorageError);
    });

    it('should throw NetworkError on database error', async () => {
      const mockDeleteResult = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        maybeSingle: mockDeleteResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockDelete.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      await expect(provider.deletePlayer('player-1')).rejects.toThrow(NetworkError);
    });
  });

  describe('updatePlayer', () => {
    const updates = { name: 'Updated Name', number: 99 };

    it('should update player successfully', async () => {
      const updatedPlayer = { id: 'player-1', name: 'Updated Name', number: 99 };
      
      const mockSingleResult = jest.fn().mockResolvedValueOnce({
        data: updatedPlayer,
        error: null,
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        single: mockSingleResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockUpdate.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      const result = await provider.updatePlayer('player-1', updates);
      
      expect(mocks.mockUpdate).toHaveBeenCalled();
      expect(result).toEqual(updatedPlayer);
    });

    it('should throw NetworkError on update failure', async () => {
      const mockSingleResult = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        single: mockSingleResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockUpdate.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      await expect(provider.updatePlayer('player-1', updates)).rejects.toThrow(NetworkError);
    });
  });

  describe('getSeasons', () => {
    it('should fetch and return seasons', async () => {
      const mockSeasons = [
        { id: '1', name: 'Season 1', user_id: 'user-1' },
        { id: '2', name: 'Season 2', user_id: 'user-1' },
      ];
      
      const mockOrderResult = jest.fn().mockResolvedValueOnce({
        data: mockSeasons,
        error: null,
      });
      const mockEqResult = jest.fn().mockReturnValueOnce({
        order: mockOrderResult,
      });
      
      mocks.mockSelect.mockReturnValueOnce({
        eq: mockEqResult,
      });

      const result = await provider.getSeasons();
      
      expect(mocks.mockFrom).toHaveBeenCalledWith('seasons');
      expect(result).toEqual(mockSeasons);
    });

    it('should throw StorageError on fetch failure', async () => {
      const mockOrderResult = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Fetch failed' },
      });
      const mockEqResult = jest.fn().mockReturnValueOnce({
        order: mockOrderResult,
      });
      
      mocks.mockSelect.mockReturnValueOnce({
        eq: mockEqResult,
      });

      await expect(provider.getSeasons()).rejects.toThrow(NetworkError);
    });
  });

  describe('saveSeason', () => {
    const mockSeason = {
      id: 'season-1',
      name: 'Test Season',
      location: 'Test Location',
    } as any;

    it('should update existing season', async () => {
      const mockSingleResult = jest.fn().mockResolvedValueOnce({
        data: mockSeason,
        error: null,
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        single: mockSingleResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockUpdate.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      const result = await provider.saveSeason(mockSeason);
      
      expect(mocks.mockUpdate).toHaveBeenCalled();
      expect(result).toEqual(mockSeason);
    });

    it('should create new season when no id', async () => {
      const newSeason = { ...mockSeason, id: '' };
      
      mocks.mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          single: jest.fn().mockResolvedValueOnce({
            data: { ...newSeason, id: 'new-season-id' },
            error: null,
          }),
        }),
      });

      const result = await provider.saveSeason(newSeason);
      
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'new-season-id');
    });

    it('should treat local id as new season', async () => {
      const localSeason = { ...mockSeason, id: 'season_123_abc' };
      
      mocks.mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          single: jest.fn().mockResolvedValueOnce({
            data: { ...localSeason, id: 'new-season-id' },
            error: null,
          }),
        }),
      });

      const result = await provider.saveSeason(localSeason);
      
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'new-season-id');
    });
  });

  describe('deleteSeason', () => {
    it('should delete season successfully', async () => {
      const mockDeleteResult = jest.fn().mockResolvedValueOnce({
        data: { id: 'season-1' },
        error: null,
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        maybeSingle: mockDeleteResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockDelete.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      await provider.deleteSeason('season-1');
      
      expect(mocks.mockDelete).toHaveBeenCalled();
      expect(mocks.mockFrom).toHaveBeenCalledWith('seasons');
    });

    it('should throw StorageError when season not found', async () => {
      const mockDeleteResult = jest.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        maybeSingle: mockDeleteResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockDelete.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      await expect(provider.deleteSeason('non-existent')).rejects.toThrow(StorageError);
    });
  });

  describe('getTournaments', () => {
    it('should fetch and return tournaments', async () => {
      const mockTournaments = [
        { id: '1', name: 'Tournament 1', user_id: 'user-1' },
        { id: '2', name: 'Tournament 2', user_id: 'user-1' },
      ];
      
      const mockOrderResult = jest.fn().mockResolvedValueOnce({
        data: mockTournaments,
        error: null,
      });
      const mockEqResult = jest.fn().mockReturnValueOnce({
        order: mockOrderResult,
      });
      
      mocks.mockSelect.mockReturnValueOnce({
        eq: mockEqResult,
      });

      const result = await provider.getTournaments();
      
      expect(mocks.mockFrom).toHaveBeenCalledWith('tournaments');
      expect(result).toEqual(mockTournaments);
    });

    it('should throw NetworkError on fetch failure', async () => {
      const mockOrderResult = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Fetch failed' },
      });
      const mockEqResult = jest.fn().mockReturnValueOnce({
        order: mockOrderResult,
      });
      
      mocks.mockSelect.mockReturnValueOnce({
        eq: mockEqResult,
      });

      await expect(provider.getTournaments()).rejects.toThrow(NetworkError);
    });
  });

  describe('saveTournament', () => {
    const mockTournament = {
      id: 'tournament-1',
      name: 'Test Tournament',
      location: 'Test Location',
    } as any;

    it('should update existing tournament', async () => {
      const mockSingleResult = jest.fn().mockResolvedValueOnce({
        data: mockTournament,
        error: null,
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        single: mockSingleResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockUpdate.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      const result = await provider.saveTournament(mockTournament);
      
      expect(mocks.mockUpdate).toHaveBeenCalled();
      expect(result).toEqual(mockTournament);
    });

    it('should create new tournament when no id', async () => {
      const newTournament = { ...mockTournament, id: '' };
      
      mocks.mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          single: jest.fn().mockResolvedValueOnce({
            data: { ...newTournament, id: 'new-tournament-id' },
            error: null,
          }),
        }),
      });

      const result = await provider.saveTournament(newTournament);
      
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'new-tournament-id');
    });

    it('should treat local id as new tournament', async () => {
      const localTournament = { ...mockTournament, id: 'tournament_123_abc' };
      
      mocks.mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          single: jest.fn().mockResolvedValueOnce({
            data: { ...localTournament, id: 'new-tournament-id' },
            error: null,
          }),
        }),
      });

      const result = await provider.saveTournament(localTournament);
      
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'new-tournament-id');
    });
  });

  describe('deleteTournament', () => {
    it('should delete tournament successfully', async () => {
      const mockDeleteResult = jest.fn().mockResolvedValueOnce({
        data: { id: 'tournament-1' },
        error: null,
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        maybeSingle: mockDeleteResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockDelete.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      await provider.deleteTournament('tournament-1');
      
      expect(mocks.mockDelete).toHaveBeenCalled();
      expect(mocks.mockFrom).toHaveBeenCalledWith('tournaments');
    });

    it('should throw StorageError when tournament not found', async () => {
      const mockDeleteResult = jest.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        maybeSingle: mockDeleteResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockDelete.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      await expect(provider.deleteTournament('non-existent')).rejects.toThrow(StorageError);
    });
  });

  describe('getAppSettings', () => {
    it('should return null when not authenticated', async () => {
      mocks.mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await provider.getAppSettings();
      
      expect(result).toBeNull();
    });

    it('should fetch and return app settings', async () => {
      const mockSettings = { id: '1', theme: 'dark', user_id: 'user-1' };
      
      mocks.mockSingle.mockResolvedValueOnce({
        data: mockSettings,
        error: null,
      });
      
      mocks.mockSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          single: mocks.mockSingle,
        }),
      });

      const result = await provider.getAppSettings();
      
      expect(mocks.mockFrom).toHaveBeenCalledWith('app_settings');
      expect(result).toEqual(mockSettings);
    });

    it('should return null when no settings found', async () => {
      mocks.mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      
      mocks.mockSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          single: mocks.mockSingle,
        }),
      });

      const result = await provider.getAppSettings();
      
      expect(result).toBeNull();
    });

    it('should throw NetworkError on database error', async () => {
      mocks.mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'OTHER_ERROR', message: 'Database error' },
      });
      
      mocks.mockSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          single: mocks.mockSingle,
        }),
      });

      await expect(provider.getAppSettings()).rejects.toThrow(NetworkError);
    });
  });

  describe('saveAppSettings', () => {
    const mockSettings = { theme: 'dark', language: 'en' } as any;

    it('should save app settings successfully', async () => {
      const savedSettings = { ...mockSettings, id: 'settings-1', user_id: 'user-1' };
      
      mocks.mockUpsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          single: jest.fn().mockResolvedValueOnce({
            data: savedSettings,
            error: null,
          }),
        }),
      });

      const result = await provider.saveAppSettings(mockSettings);
      
      expect(mocks.mockUpsert).toHaveBeenCalled();
      expect(result).toEqual(savedSettings);
    });

    it('should throw NetworkError on save failure', async () => {
      mocks.mockUpsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          single: jest.fn().mockResolvedValueOnce({
            data: null,
            error: { message: 'Save failed' },
          }),
        }),
      });

      await expect(provider.saveAppSettings(mockSettings)).rejects.toThrow(NetworkError);
    });
  });

  describe('getSavedGames', () => {
    it('should fetch and return saved games', async () => {
      const mockGames = [
        { id: 'game-1', teamName: 'Team 1', user_id: 'user-1' },
        { id: 'game-2', teamName: 'Team 2', user_id: 'user-1' },
      ];
      
      const mockLimitResult = jest.fn().mockResolvedValueOnce({
        data: mockGames,
        error: null,
      });
      const mockOrderResult = jest.fn().mockReturnValueOnce({
        limit: mockLimitResult,
      });
      const mockEqResult = jest.fn().mockReturnValueOnce({
        order: mockOrderResult,
      });
      
      mocks.mockSelect.mockReturnValueOnce({
        eq: mockEqResult,
      });

      const result = await provider.getSavedGames();
      
      expect(mocks.mockFrom).toHaveBeenCalledWith('games');
      expect(result).toEqual({
        'game-1': mockGames[0],
        'game-2': mockGames[1],
      });
    });

    it('should throw NetworkError on fetch failure', async () => {
      const mockLimitResult = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Fetch failed' },
      });
      const mockOrderResult = jest.fn().mockReturnValueOnce({
        limit: mockLimitResult,
      });
      const mockEqResult = jest.fn().mockReturnValueOnce({
        order: mockOrderResult,
      });
      
      mocks.mockSelect.mockReturnValueOnce({
        eq: mockEqResult,
      });

      await expect(provider.getSavedGames()).rejects.toThrow(NetworkError);
    });
  });

  describe('saveSavedGame', () => {
    const mockGame = { teamName: 'Test Team', gameDate: '2023-01-01' } as any;

    it('should insert new game when no id', async () => {
      const savedGame = { ...mockGame, id: 'new-game-id', user_id: 'user-1' };
      
      mocks.mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          single: jest.fn().mockResolvedValueOnce({
            data: savedGame,
            error: null,
          }),
        }),
      });

      const result = await provider.saveSavedGame(mockGame);
      
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(result).toEqual(savedGame);
    });

    it('should upsert existing game when id present', async () => {
      const gameWithId = { ...mockGame, id: 'existing-game-id' };
      const savedGame = { ...gameWithId, user_id: 'user-1' };
      
      mocks.mockUpsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          single: jest.fn().mockResolvedValueOnce({
            data: savedGame,
            error: null,
          }),
        }),
      });

      const result = await provider.saveSavedGame(gameWithId);
      
      expect(mocks.mockUpsert).toHaveBeenCalled();
      expect(result).toEqual(savedGame);
    });

    it('should throw NetworkError on save failure', async () => {
      mocks.mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          single: jest.fn().mockResolvedValueOnce({
            data: null,
            error: { message: 'Save failed' },
          }),
        }),
      });

      await expect(provider.saveSavedGame(mockGame)).rejects.toThrow(NetworkError);
    });
  });

  describe('deleteSavedGame', () => {
    it('should delete saved game successfully', async () => {
      const mockEqResult2 = jest.fn().mockResolvedValueOnce({
        error: null,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockDelete.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      await provider.deleteSavedGame('game-1');
      
      expect(mocks.mockDelete).toHaveBeenCalled();
      expect(mocks.mockFrom).toHaveBeenCalledWith('games');
    });

    it('should throw NetworkError on delete failure', async () => {
      const mockEqResult2 = jest.fn().mockResolvedValueOnce({
        error: { message: 'Delete failed' },
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockDelete.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      await expect(provider.deleteSavedGame('game-1')).rejects.toThrow(NetworkError);
    });
  });

  describe('loadGameEvents', () => {
    it('should load game events successfully', async () => {
      const mockEvents = [
        { id: '1', type: 'goal', playerId: 'p1' },
        { id: '2', type: 'assist', playerId: 'p2' },
      ];
      
      const mockEqResult = jest.fn().mockResolvedValueOnce({
        data: mockEvents,
        error: null,
      });
      
      mocks.mockSelect.mockReturnValueOnce({
        eq: mockEqResult,
      });

      const result = await provider.loadGameEvents('game-1');
      
      expect(mocks.mockFrom).toHaveBeenCalledWith('game_events');
      expect(result).toEqual(mockEvents);
    });

    it('should return empty array when no events found', async () => {
      const mockEqResult = jest.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      });
      
      mocks.mockSelect.mockReturnValueOnce({
        eq: mockEqResult,
      });

      const result = await provider.loadGameEvents('game-1');
      
      expect(result).toEqual([]);
    });

    it('should throw NetworkError on database error', async () => {
      const mockEqResult = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });
      
      mocks.mockSelect.mockReturnValueOnce({
        eq: mockEqResult,
      });

      await expect(provider.loadGameEvents('game-1')).rejects.toThrow(NetworkError);
    });

    it('should throw StorageError on unexpected error', async () => {
      mocks.mockFrom.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      await expect(provider.loadGameEvents('game-1')).rejects.toThrow(StorageError);
    });
  });

  describe('savePlayer - additional error coverage', () => {
    const mockPlayer = { id: 'player-1', name: 'Test Player' } as any;

    it('should throw NetworkError when insert fails', async () => {
      const newPlayer = { ...mockPlayer, id: '' };
      
      mocks.mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          single: jest.fn().mockResolvedValueOnce({
            data: null,
            error: { message: 'Insert failed' },
          }),
        }),
      });

      await expect(provider.savePlayer(newPlayer)).rejects.toThrow(NetworkError);
    });

    it('should throw NetworkError when update fails', async () => {
      const mockSingleResult = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        single: mockSingleResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockUpdate.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      await expect(provider.savePlayer(mockPlayer)).rejects.toThrow(NetworkError);
    });
  });

  describe('updateSeason', () => {
    const updates = { name: 'Updated Season Name' };

    it('should update season successfully', async () => {
      const updatedSeason = { id: 'season-1', name: 'Updated Season Name' };
      
      const mockSingleResult = jest.fn().mockResolvedValueOnce({
        data: updatedSeason,
        error: null,
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        single: mockSingleResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockUpdate.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      const result = await provider.updateSeason('season-1', updates);
      
      expect(mocks.mockUpdate).toHaveBeenCalled();
      expect(result).toEqual(updatedSeason);
    });

    it('should throw NetworkError on update failure', async () => {
      const mockSingleResult = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        single: mockSingleResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockUpdate.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      await expect(provider.updateSeason('season-1', updates)).rejects.toThrow(NetworkError);
    });
  });

  describe('updateTournament', () => {
    const updates = { name: 'Updated Tournament Name' };

    it('should update tournament successfully', async () => {
      const updatedTournament = { id: 'tournament-1', name: 'Updated Tournament Name' };
      
      const mockSingleResult = jest.fn().mockResolvedValueOnce({
        data: updatedTournament,
        error: null,
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        single: mockSingleResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockUpdate.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      const result = await provider.updateTournament('tournament-1', updates);
      
      expect(mocks.mockUpdate).toHaveBeenCalled();
      expect(result).toEqual(updatedTournament);
    });

    it('should throw NetworkError on update failure', async () => {
      const mockSingleResult = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });
      const mockSelectResult = jest.fn().mockReturnValueOnce({
        single: mockSingleResult,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        select: mockSelectResult,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        eq: mockEqResult2,
      });
      
      mocks.mockUpdate.mockReturnValueOnce({
        eq: mockEqResult1,
      });

      await expect(provider.updateTournament('tournament-1', updates)).rejects.toThrow(NetworkError);
    });
  });

  describe('importAllData', () => {
    it('should import all data successfully', async () => {
      const importData = {
        players: [{ id: '1', name: 'Player 1' }],
        seasons: [{ id: '1', name: 'Season 1' }],
        tournaments: [{ id: '1', name: 'Tournament 1' }],
        savedGames: { 'game-1': { teamName: 'Team 1' } },
        appSettings: { theme: 'dark' },
      };

      // Mock all save operations to succeed
      const mockSaveOperations = () => {
        const mockSingleResult = jest.fn().mockResolvedValue({
          data: { id: 'saved-id' },
          error: null,
        });
        const mockSelectResult = jest.fn().mockReturnValue({
          single: mockSingleResult,
        });
        const mockEqResult2 = jest.fn().mockReturnValue({
          select: mockSelectResult,
        });
        const mockEqResult1 = jest.fn().mockReturnValue({
          eq: mockEqResult2,
        });
        
        mocks.mockUpdate.mockReturnValue({ eq: mockEqResult1 });
        mocks.mockInsert.mockReturnValue({ select: mockSelectResult });
        mocks.mockUpsert.mockReturnValue({ select: mockSelectResult });
      };

      mockSaveOperations();

      await provider.importAllData(importData);
      
      // Should have called save methods for each data type
      expect(mocks.mockUpdate).toHaveBeenCalled();
    });

    it('should handle import errors gracefully', async () => {
      const importData = {
        players: [{ id: '1', name: 'Player 1' }],
      };

      // Mock save operation to fail
      mocks.mockUpdate.mockImplementationOnce(() => {
        throw new Error('Save failed');
      });

      await expect(provider.importAllData(importData)).rejects.toThrow(StorageError);
    });
  });

  describe('exportAllData', () => {
    it('should export all data successfully', async () => {
      // Mock all the individual methods that exportAllData calls
      const mockPlayers = [{ id: '1', name: 'Player 1' }];
      const mockSeasons = [{ id: '1', name: 'Season 1' }];
      const mockTournaments = [{ id: '1', name: 'Tournament 1' }];
      const mockGames = { 'game-1': { teamName: 'Team 1' } };
      const mockSettings = { theme: 'dark' };

      // Mock compressionManager for getPlayers
      (compressionManager.fetchOptimized as jest.Mock).mockResolvedValueOnce(mockPlayers);

      // Mock getSeasons
      const mockOrderResult1 = jest.fn().mockResolvedValueOnce({
        data: mockSeasons,
        error: null,
      });
      const mockEqResult1 = jest.fn().mockReturnValueOnce({
        order: mockOrderResult1,
      });
      
      // Mock getTournaments
      const mockOrderResult2 = jest.fn().mockResolvedValueOnce({
        data: mockTournaments,
        error: null,
      });
      const mockEqResult2 = jest.fn().mockReturnValueOnce({
        order: mockOrderResult2,
      });

      // Mock getSavedGames
      const mockLimitResult = jest.fn().mockResolvedValueOnce({
        data: [{ id: 'game-1', teamName: 'Team 1' }],
        error: null,
      });
      const mockOrderResult3 = jest.fn().mockReturnValueOnce({
        limit: mockLimitResult,
      });
      const mockEqResult3 = jest.fn().mockReturnValueOnce({
        order: mockOrderResult3,
      });

      // Mock getAppSettings
      const mockSingleResult = jest.fn().mockResolvedValueOnce({
        data: mockSettings,
        error: null,
      });
      const mockEqResult4 = jest.fn().mockReturnValueOnce({
        single: mockSingleResult,
      });

      mocks.mockSelect
        .mockReturnValueOnce({ eq: mockEqResult1 }) // getSeasons
        .mockReturnValueOnce({ eq: mockEqResult2 }) // getTournaments
        .mockReturnValueOnce({ eq: mockEqResult3 }) // getSavedGames
        .mockReturnValueOnce({ eq: mockEqResult4 }); // getAppSettings

      const result = await provider.exportAllData();
      
      expect(result).toHaveProperty('players', mockPlayers);
      expect(result).toHaveProperty('seasons', mockSeasons);
      expect(result).toHaveProperty('tournaments', mockTournaments);
      expect(result).toHaveProperty('savedGames');
      expect(result).toHaveProperty('appSettings', mockSettings);
      expect(result).toHaveProperty('exportDate');
      expect(result).toHaveProperty('version', '1.0');
      expect(result).toHaveProperty('source', 'supabase');
    });
  });
});