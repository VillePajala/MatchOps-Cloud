// Polyfills first
import 'whatwg-fetch';
import 'fake-indexeddb/auto';
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// BroadcastChannel polyfill
if (typeof BroadcastChannel === 'undefined') {
  global.BroadcastChannel = class BroadcastChannel {
    constructor(name) {
      this.name = name;
      this.onmessage = null;
    }
    postMessage(_message) {
      // No-op in test environment
    }
    close() {
      // No-op in test environment
    }
  };
}

// JSDOM matchers
import '@testing-library/jest-dom';

// MSW in Node (not the browser worker)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { server } = require('./test/msw/server');
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
} catch {
  // MSW not available, continue without it
  console.warn('MSW server not available for tests');
}

// Suppress console errors during tests unless explicitly enabled
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Only suppress console output in CI mode to reduce noise
  if (process.env.CI === 'true') {
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore original console methods
  if (process.env.CI === 'true') {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  }
});

// Mock window.location if needed by tests
const originalLocation = window.location;

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    getAll: () => store,
  };
})();

// Mock window APIs
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Mock alert/confirm/prompt
window.alert = jest.fn();
window.confirm = jest.fn();
window.prompt = jest.fn();

// Mock URL API if needed by tests
global.URL.createObjectURL = jest.fn(() => 'blob:mockedurl/123');
global.URL.revokeObjectURL = jest.fn();

// Mock DataTransfer for drag and drop tests
global.DataTransfer = class DataTransfer {
  constructor() {
    this.data = {};
    this.types = [];
  }
  
  setData(format, data) {
    this.data[format] = data;
    if (!this.types.includes(format)) {
      this.types.push(format);
    }
  }
  
  getData(format) {
    return this.data[format] || '';
  }
  
  clearData(format) {
    if (format) {
      delete this.data[format];
      this.types = this.types.filter(type => type !== format);
    } else {
      this.data = {};
      this.types = [];
    }
  }
};

// Mock DragEvent to include dataTransfer for React Testing Library
Object.defineProperty(window, 'DragEvent', {
  value: class DragEvent extends Event {
    constructor(type, eventInitDict = {}) {
      super(type, eventInitDict);
      this.dataTransfer = new global.DataTransfer();
    }
  },
});

// Mock for fireEvent drag events
const originalCreateEvent = document.createEvent;
document.createEvent = function(eventType) {
  const event = originalCreateEvent.call(this, eventType);
  if (eventType === 'DragEvent' || event.type === 'dragstart' || event.type === 'drag' || event.type === 'dragover' || event.type === 'drop') {
    event.dataTransfer = new global.DataTransfer();
  }
  return event;
};

// Restore all mocks after each test
afterEach(() => {
  jest.restoreAllMocks();
  localStorageMock.clear();
});

// Clean up after all tests complete
afterAll(() => {
  // Restore original window.location if it was modified
  Object.defineProperty(window, 'location', { value: originalLocation });
}); 