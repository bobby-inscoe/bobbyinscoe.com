// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ListingCard } from '@/features/house-scanner/components/listing-card';
import { ListingPhoto } from '@/features/house-scanner/components/listing-photo';
import {
  DEMO_USER_ID,
  STALE_LISTING_ID,
  SYNTHETIC_SNAPSHOT,
} from '@/features/house-scanner/mock/synthetic-household';

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
  expect(screen.getByText('No photo')).toBeTruthy();
});

async function renderCard(stale: boolean, details: boolean) {
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
  const { MantineProvider } = await import('@mantine/core');
  const listing = SYNTHETIC_SNAPSHOT.listings.find(
    (entry) => entry.id === STALE_LISTING_ID,
  );
  if (!listing) throw new Error('The stale demo listing is missing.');
  render(
    <MantineProvider>
      <ListingCard
        listing={listing}
        snapshot={SYNTHETIC_SNAPSHOT}
        userId={DEMO_USER_ID}
        details={details}
        stale={stale}
        busy={false}
        canSave
        onSelect={() => {}}
        onFavorite={() => {}}
      />
    </MantineProvider>,
  );
}

it('shows the badge and the notice with the last seen date on a stale listing', async () => {
  await renderCard(true, true);
  expect(screen.getByText('Not in latest scan')).toBeTruthy();
  const notice = screen.getByRole('note', {
    name: 'Not seen in the latest scan',
  });
  expect(notice.textContent).toContain(
    'Not seen in the latest scan. Last seen',
  );
  expect(notice.textContent).not.toContain('—');
});

it('shows only the badge in the collapsed summary of a stale listing', async () => {
  await renderCard(true, false);
  expect(screen.getByText('Not in latest scan')).toBeTruthy();
  expect(screen.queryByRole('note')).toBeNull();
});

it('shows neither the badge nor the notice on a listing that is not stale', async () => {
  await renderCard(false, true);
  expect(screen.queryByText('Not in latest scan')).toBeNull();
  expect(screen.queryByRole('note')).toBeNull();
});
