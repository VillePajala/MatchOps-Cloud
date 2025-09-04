jest.mock('../supabase', () => {
  const mockMaybeSingle = jest.fn();
  const mockSelect = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockEq = jest.fn(() => ({ eq: mockEq, select: mockSelect }));
  const mockDelete = jest.fn(() => ({ eq: mockEq, select: mockSelect }));
  const mockFrom = jest.fn(() => ({ delete: mockDelete }));
  const mockGetUser = jest
    .fn()
    .mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

  return {
    supabase: {
      from: mockFrom,
      auth: { getUser: mockGetUser },
      __mock: { mockMaybeSingle, mockSelect, mockEq, mockDelete, mockFrom, mockGetUser }
    }
  };
});

import { SupabaseProvider } from './supabaseProvider';
import { supabase } from '../supabase';

const { mockMaybeSingle, mockGetUser } = (supabase as unknown as {
  __mock: {
    mockMaybeSingle: jest.Mock;
    mockGetUser: jest.Mock;
  };
}).__mock;

describe('SupabaseProvider delete methods', () => {
  let provider: SupabaseProvider;

  beforeEach(() => {
    provider = new SupabaseProvider();
    jest.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });
  });

  it('throws StorageError when deleting non-existent player', async () => {
    await expect(provider.deletePlayer('missing'))
      .rejects.toThrow('Player not found');
  });

  it('throws StorageError when deleting non-existent season', async () => {
    await expect(provider.deleteSeason('missing'))
      .rejects.toThrow('Season not found');
  });

  it('throws StorageError when deleting non-existent tournament', async () => {
    await expect(provider.deleteTournament('missing'))
      .rejects.toThrow('Tournament not found');
  });

  it('completes without error when deleting non-existent saved game', async () => {
    await expect(provider.deleteSavedGame('missing'))
      .resolves.toBeUndefined();
  });
});

