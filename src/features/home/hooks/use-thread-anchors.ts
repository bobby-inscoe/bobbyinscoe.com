import { useCallback, useEffect, useRef, useState } from 'react';

import type { ThreadAnchor } from '@/shared/ui/thread-spine';

/*
 * Measures one anchor per collection entry, from the DOM. Never from an index:
 * an entry's height depends on its blurb, its presentation and the viewport,
 * so a computed position would be right on one screen and wrong on the next.
 *
 * The Y is the entry's vertical centre, which is where its status node sits:
 * .node is align-self: center in a single-row grid, so the node's centre and
 * the row's centre are the same number and the entry element can be measured
 * without reaching inside it.
 */

export interface ThreadAnchorSource {
  id: string;
  filled: boolean;
}

export interface ThreadAnchors {
  anchors: readonly ThreadAnchor[];
  /** Stable per id, so passing it as a ref does not detach on every render. */
  registerAnchor: (id: string) => (element: HTMLElement | null) => void;
}

function same(a: readonly ThreadAnchor[], b: readonly ThreadAnchor[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (anchor, i) =>
        anchor.id === b[i].id &&
        anchor.y === b[i].y &&
        anchor.filled === b[i].filled,
    )
  );
}

export function useThreadAnchors(
  sources: readonly ThreadAnchorSource[],
): ThreadAnchors {
  const [anchors, setAnchors] = useState<readonly ThreadAnchor[]>([]);
  const elements = useRef(new Map<string, HTMLElement>());
  const callbacks = useRef(
    new Map<string, (element: HTMLElement | null) => void>(),
  );
  const remeasure = useRef<() => void>(() => {});

  const registerAnchor = useCallback((id: string) => {
    const existing = callbacks.current.get(id);
    if (existing) return existing;

    const callback = (element: HTMLElement | null) => {
      if (element) elements.current.set(id, element);
      else elements.current.delete(id);
      remeasure.current();
    };

    callbacks.current.set(id, callback);
    return callback;
  }, []);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      const next: ThreadAnchor[] = [];

      for (const source of sources) {
        const element = elements.current.get(source.id);
        if (!element) continue;

        const rect = element.getBoundingClientRect();
        next.push({
          id: source.id,
          y: Math.round(rect.top + window.scrollY + rect.height / 2),
          filled: source.filled,
        });
      }

      setAnchors((current) => (same(current, next) ? current : next));
    };

    const schedule = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    remeasure.current = schedule;

    const observer = new ResizeObserver(schedule);
    for (const element of elements.current.values()) observer.observe(element);
    window.addEventListener('resize', schedule);

    // Type loads after first paint and reflows every entry under it.
    if ('fonts' in document) void document.fonts.ready.then(schedule);

    measure();

    return () => {
      remeasure.current = () => {};
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [sources]);

  return { anchors, registerAnchor };
}
