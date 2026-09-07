import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Reveal } from '@/shared/ui/reveal';

/*
 * Tier one: the stagger cap is the only logic in this component. The rest of
 * the reveal is CSS, and jsdom does not run animations, so what can be checked
 * here is that the children reach the document and that the order handed to
 * CSS stops at the cap the spec sets.
 */

afterEach(cleanup);

function orderOf(element: HTMLElement): string | null {
  return element.style.getPropertyValue('--reveal-order') || null;
}

describe('Reveal', () => {
  it('renders its children', () => {
    render(
      <Reveal>
        <p>visible</p>
      </Reveal>,
    );
    expect(screen.getByText('visible')).toBeDefined();
  });

  it('defaults to the first position', () => {
    render(
      <Reveal>
        <p>first</p>
      </Reveal>,
    );
    expect(
      orderOf(screen.getByText('first').parentElement as HTMLElement),
    ).toBe('0');
  });

  it('staggers up to the sixth item', () => {
    render(
      <Reveal index={4}>
        <p>fifth</p>
      </Reveal>,
    );
    expect(
      orderOf(screen.getByText('fifth').parentElement as HTMLElement),
    ).toBe('4');
  });

  it('holds everything past the sixth at the same position', () => {
    render(
      <Reveal index={40}>
        <p>late</p>
      </Reveal>,
    );
    expect(orderOf(screen.getByText('late').parentElement as HTMLElement)).toBe(
      '5',
    );
  });
});
