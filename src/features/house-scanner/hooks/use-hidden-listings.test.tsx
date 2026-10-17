// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_HIDDEN,
  useHiddenListings,
} from '@/features/house-scanner/hooks/use-hidden-listings';

const KEY = 'house-scanner:hidden:household-1:user-1';
const member = { householdId: 'household-1', userId: 'user-1', persist: true };

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('personal hidden homes', () => {
  it('stores only listing ids under a household and member key, and removes them again', () => {
    const { result } = renderHook(() => useHiddenListings(member));
    act(() => result.current.hide('a'));
    act(() => result.current.hide('b'));
    expect([...result.current.hidden]).toEqual(['a', 'b']);
    expect(JSON.parse(localStorage.getItem(KEY) ?? '')).toEqual(['a', 'b']);
    act(() => result.current.unhide('a'));
    expect(JSON.parse(localStorage.getItem(KEY) ?? '')).toEqual(['b']);
    expect(Object.keys(localStorage)).toEqual([KEY]);
  });

  it('reads what an earlier visit stored, and keeps each member and household apart', () => {
    localStorage.setItem(KEY, JSON.stringify(['a']));
    const { result, rerender } = renderHook(
      (props: typeof member) => useHiddenListings(props),
      { initialProps: member },
    );
    expect(result.current.hidden.has('a')).toBe(true);
    rerender({ ...member, userId: 'user-2' });
    expect(result.current.hidden.size).toBe(0);
    rerender(member);
    expect(result.current.hidden.has('a')).toBe(true);
  });

  it.each([
    ['not JSON', '{oops'],
    ['not an array', JSON.stringify({ a: true })],
  ])('ignores stored data that is %s', (_name, stored) => {
    localStorage.setItem(KEY, stored);
    const { result } = renderHook(() => useHiddenListings(member));
    expect(result.current.hidden.size).toBe(0);
  });

  it('keeps only string ids and caps how many it reads', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify(['a', 1, null, ...Array(MAX_HIDDEN + 5).fill('x')]),
    );
    const { result } = renderHook(() => useHiddenListings(member));
    expect(result.current.hidden.has('a')).toBe(true);
    expect(result.current.hidden.has('x')).toBe(true);
    expect(result.current.hidden.size).toBeLessThanOrEqual(MAX_HIDDEN);
  });

  it('leaves browser storage alone when it should not persist (the demo)', () => {
    const { result } = renderHook(() =>
      useHiddenListings({ ...member, persist: false }),
    );
    act(() => result.current.hide('a'));
    expect(result.current.hidden.has('a')).toBe(true);
    expect(localStorage.length).toBe(0);
  });

  it('keeps working in memory when storage is denied', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const { result } = renderHook(() => useHiddenListings(member));
    act(() => result.current.hide('a'));
    expect(result.current.hidden.has('a')).toBe(true);
    act(() => result.current.unhide('a'));
    expect(result.current.hidden.size).toBe(0);
  });

  it('hands out the same functions across renders', () => {
    const { result, rerender } = renderHook(() => useHiddenListings(member));
    const { hide, unhide } = result.current;
    act(() => result.current.hide('a'));
    rerender();
    expect(result.current.hide).toBe(hide);
    expect(result.current.unhide).toBe(unhide);
  });
});
