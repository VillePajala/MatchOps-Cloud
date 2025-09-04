const { http, HttpResponse } = require('msw');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';

// Define mock data
const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

const mockSavedGames = {
  'game-1': {
    teamName: 'Test Team',
    opponentName: 'Opponent Team',
    homeScore: 2,
    awayScore: 1,
    gameStatus: 'gameEnd',
    isPlayed: true,
    gameDate: '2024-01-15',
  },
  'game-2': {
    teamName: 'Test Team',
    opponentName: 'Another Team',
    homeScore: 0,
    awayScore: 0,
    gameStatus: 'notStarted',
    isPlayed: false,
    gameDate: '2024-01-20',
  },
};

const mockSeasons = [
  {
    id: 'season-1',
    name: 'Spring 2024',
    location: 'Stadium A',
    periodCount: 2,
    periodDuration: 45,
    archived: false,
    defaultRoster: [],
  },
  {
    id: 'season-2',
    name: 'Fall 2024',
    location: 'Stadium B',
    periodCount: 2,
    periodDuration: 45,
    archived: false,
    defaultRoster: [],
  },
];

const mockTournaments = [
  {
    id: 'tournament-1',
    name: 'Summer Cup',
    location: 'Arena',
    periodCount: 2,
    periodDuration: 30,
    archived: false,
    defaultRoster: [],
  },
];

const handlers = [
  // Auth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/token`, async ({ request }) => {
    const body = await request.json();
    
    if (body.grant_type === 'password') {
      // Login
      return HttpResponse.json({
        access_token: mockSession.access_token,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: mockSession.refresh_token,
        user: mockUser,
      });
    }
    
    if (body.grant_type === 'refresh_token') {
      // Token refresh
      return HttpResponse.json({
        access_token: 'refreshed-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'new-refresh-token',
        user: mockUser,
      });
    }
    
    return HttpResponse.json({ error: 'Invalid grant type' }, { status: 400 });
  }),

  http.post(`${SUPABASE_URL}/auth/v1/signup`, async () => {
    return HttpResponse.json({
      id: 'new-user-id',
      email: 'newuser@example.com',
      confirmation_sent_at: new Date().toISOString(),
    });
  }),

  http.post(`${SUPABASE_URL}/auth/v1/logout`, async () => {
    return HttpResponse.json({});
  }),

  http.post(`${SUPABASE_URL}/auth/v1/recover`, async () => {
    return HttpResponse.json({});
  }),

  http.get(`${SUPABASE_URL}/auth/v1/user`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({ data: mockUser });
  }),

  // Storage endpoints for saved games
  http.get(`${SUPABASE_URL}/storage/v1/object/public/game-saves/*`, async ({ params }) => {
    const path = params[0] as string;
    
    if (path.includes('saved-games.json')) {
      return HttpResponse.json(mockSavedGames);
    }
    
    if (path.includes('seasons.json')) {
      return HttpResponse.json(mockSeasons);
    }
    
    if (path.includes('tournaments.json')) {
      return HttpResponse.json(mockTournaments);
    }
    
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  http.post(`${SUPABASE_URL}/storage/v1/object/public/game-saves/*`, async ({ request }) => {
    const body = await request.json();
    
    return HttpResponse.json({
      Key: `game-saves/${Date.now()}.json`,
      data: body,
    });
  }),

  http.put(`${SUPABASE_URL}/storage/v1/object/public/game-saves/*`, async ({ request }) => {
    const body = await request.json();
    
    return HttpResponse.json({
      Key: `game-saves/${Date.now()}.json`,
      data: body,
    });
  }),

  http.delete(`${SUPABASE_URL}/storage/v1/object/public/game-saves/*`, async () => {
    return HttpResponse.json({});
  }),

  // Database endpoints
  http.get(`${SUPABASE_URL}/rest/v1/saved_games`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json(Object.entries(mockSavedGames).map(([id, game]) => ({
      id,
      user_id: mockUser.id,
      game_data: game,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })));
  }),

  http.post(`${SUPABASE_URL}/rest/v1/saved_games`, async ({ request }) => {
    const body = await request.json();
    
    return HttpResponse.json({
      id: `game-${Date.now()}`,
      user_id: mockUser.id,
      game_data: body.game_data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/saved_games`, async ({ request }) => {
    const body = await request.json();
    
    return HttpResponse.json({
      id: body.id,
      user_id: mockUser.id,
      game_data: body.game_data,
      updated_at: new Date().toISOString(),
    });
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/saved_games`, async () => {
    return HttpResponse.json({});
  }),

  // Health check
  http.get(`${SUPABASE_URL}/health`, async () => {
    return HttpResponse.json({ status: 'ok' });
  }),
];

// Error simulation handlers for testing error scenarios
const errorHandlers = {
  authError: http.post(`${SUPABASE_URL}/auth/v1/token`, async () => {
    return HttpResponse.json(
      { error: 'Invalid login credentials', message: 'Invalid login credentials' },
      { status: 400 }
    );
  }),

  networkError: http.get(`${SUPABASE_URL}/storage/v1/object/public/game-saves/*`, async () => {
    return HttpResponse.error();
  }),

  serverError: http.get(`${SUPABASE_URL}/rest/v1/saved_games`, async () => {
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }),

  quotaExceeded: http.post(`${SUPABASE_URL}/storage/v1/object/public/game-saves/*`, async () => {
    return HttpResponse.json(
      { error: 'Quota exceeded', message: 'Storage quota exceeded' },
      { status: 507 }
    );
  }),

  rateLimited: http.get(`${SUPABASE_URL}/rest/v1/saved_games`, async () => {
    return HttpResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }),
};
module.exports = { handlers, errorHandlers };
