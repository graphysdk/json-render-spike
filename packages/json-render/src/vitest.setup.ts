import { vi } from 'vitest';

vi.mock('motion/react', () => ({
  useReducedMotion: () => false,
}));

// jsdom does not provide ResizeObserver, which the renderer's sizing step observes with.
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
