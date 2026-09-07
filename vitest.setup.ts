/*
 * jsdom implements neither of these, and both are reached on first render:
 * Mantine's provider probes matchMedia for the colour scheme, and Duck Feed's
 * board measures itself with a ResizeObserver. Stubbing what jsdom is missing
 * is not mocking our own code.
 */

class MediaQueryListStub extends EventTarget {
  readonly matches = false;
  readonly media: string;
  readonly onchange = null;

  constructor(media: string) {
    super();
    this.media = media;
  }

  addListener() {}
  removeListener() {}
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (media: string) => new MediaQueryListStub(media),
  });
}

if (typeof globalThis.ResizeObserver !== 'function') {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverStub,
  });
}
