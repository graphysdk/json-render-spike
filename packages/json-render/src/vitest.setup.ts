import { vi } from 'vitest';

vi.mock('motion/react', () => ({
  useReducedMotion: () => false,
}));

// jsdom does not provide ResizeObserver, which the sizing step observes with.
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
