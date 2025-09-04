// Mock for MSW when it can't be resolved
export const http = {
  get: jest.fn((url, handler) => ({ url, handler })),
  post: jest.fn((url, handler) => ({ url, handler })),
  put: jest.fn((url, handler) => ({ url, handler })),
  delete: jest.fn((url, handler) => ({ url, handler })),
  patch: jest.fn((url, handler) => ({ url, handler })),
};

export const HttpResponse = {
  json: jest.fn((data, init) => ({ data, init })),
  text: jest.fn((text, init) => ({ text, init })),
  error: jest.fn(() => ({ error: true })),
};

export const setupServer = jest.fn((...handlers) => ({
  listen: jest.fn(),
  close: jest.fn(),
  resetHandlers: jest.fn(),
  use: jest.fn(),
}));