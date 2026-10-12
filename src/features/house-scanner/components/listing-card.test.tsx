// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ListingPhoto } from '@/features/house-scanner/components/listing-card';
import { SYNTHETIC_SNAPSHOT } from '@/features/house-scanner/mock/synthetic-household';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it('removes a permitted photo as soon as its display permission expires', async () => {
  vi.stubGlobal(
    'matchMedia',
    (media: string): MediaQueryList => ({
      media,
      matches: false,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  );
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
  const { MantineProvider } = await import('@mantine/core');
  render(
    <MantineProvider>
      <ListingPhoto
        listing={{
          ...SYNTHETIC_SNAPSHOT.listings[0],
          photo: {
            url: 'https://images.example.invalid/synthetic.jpg',
            attribution: 'Synthetic author',
            rightsBasis: 'Authored fixture',
            observedAt: '2026-10-12T12:00:00Z',
            expiresAt: '2026-10-12T12:00:01Z',
            displayAllowed: true,
            hotlinkAllowed: true,
          },
        }}
      />
    </MantineProvider>,
  );
  expect(screen.getByRole('img').getAttribute('referrerpolicy')).toBe(
    'no-referrer',
  );
  await act(async () => {
    vi.advanceTimersByTime(1001);
  });
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.getByText('No permitted photo available')).toBeTruthy();
});
