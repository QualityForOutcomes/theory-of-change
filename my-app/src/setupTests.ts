// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
// src/setupTests.ts
import '@testing-library/jest-dom';

// ========== FIX FOR READ-ONLY PROPERTIES ==========

// Mock scrollHeight (fixes TypeScript read-only error)
Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
  configurable: true,
  get: function(this: any) {
    return this._scrollHeight || 100;
  },
  set: function(this: any, value: number) {
    this._scrollHeight = value;
  }
});

// Mock style.height setter
Object.defineProperty(HTMLElement.prototype, 'style', {
  writable: true,
  value: new Proxy({} as CSSStyleDeclaration, {
    get: (target: any, prop: string | symbol) => {
      return target[prop] || '';
    },
    set: (target: any, prop: string | symbol, value: any) => {
      target[prop] = value;
      return true;
    }
  })
});

// ========== PERFORMANCE OPTIMIZATIONS ==========

// Mock getBoundingClientRect (prevents layout calculations)
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 120,
  height: 120,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  x: 0,
  y: 0,
  toJSON: () => {}
})) as any;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// ========== CONSOLE SUPPRESSION (OPTIONAL) ==========

const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Warning: useLayoutEffect') ||
       args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  });
  
  console.warn = jest.fn((...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning:')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// ========== EXPORT TEST SETUP ==========

// Mock window.alert
global.alert = jest.fn();

// Reset mocks and DOM before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset document.body
  if (document.body) {
    document.body.innerHTML = '';
  }
  
  // Reset alert mock
  (global.alert as jest.Mock).mockClear();
});

// Clean up after each test
afterEach(() => {
  if (document.body) {
    document.body.innerHTML = '';
  }
});