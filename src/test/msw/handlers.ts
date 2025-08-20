import { http, HttpResponse } from 'msw';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';

export const handlers = [
  // Auth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/token`, async () => {
    return HttpResponse.json({
      access_token: 'mock-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'user-1',
        email: 'test@example.com'
      }
    });
  }),

  // Storage endpoints - basic CRUD
  http.get(`${SUPABASE_URL}/rest/v1/*`, async () => {
    return HttpResponse.json([]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/*`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ id: 'new-id', ...body });
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/*`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ id: 'updated-id', ...body });
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/*`, async () => {
    return HttpResponse.json({ id: 'deleted-id' });
  }),
];