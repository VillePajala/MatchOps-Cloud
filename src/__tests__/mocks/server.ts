import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup the server with default handlers
export const server = setupServer(...handlers);

// Enable request interception
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

// Reset handlers between tests
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());