import { Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';

import {
  DEMO_HOUSEHOLD_ID,
  DEMO_USER_ID,
  SYNTHETIC_SNAPSHOT,
} from '@/features/projects/features/house-scanner/mock/synthetic-household';
import type { Favorite } from '@/features/projects/features/house-scanner/types/contracts';
import { matchListing } from '@/features/projects/features/house-scanner/utils/match-listing';

export function SyntheticWorkspace() {
  const [favorites, setFavorites] = useState<Favorite[]>(
    SYNTHETIC_SNAPSHOT.favorites,
  );
  return (
    <Stack>
      <Text role="status">
        Synthetic demo. No live collection. Signed in as fictional Demo Alex.
      </Text>
      {SYNTHETIC_SNAPSHOT.listings.map((listing) => {
        const mine = favorites.some(
          (f) => f.listingId === listing.id && f.userId === DEMO_USER_ID,
        );
        const match = matchListing(
          listing,
          SYNTHETIC_SNAPSHOT.profiles[0].criteria,
        );
        return (
          <Paper key={listing.id} withBorder p="md">
            <Stack gap="sm">
              <Title order={2}>{listing.title}</Title>
              <Text>
                {match.section}: {match.reasons.join(', ')}
              </Text>
              <Text>{match.caveats.join('; ')}</Text>
              <Text>
                Saved by:{' '}
                {favorites
                  .filter((f) => f.listingId === listing.id)
                  .map(
                    (f) =>
                      SYNTHETIC_SNAPSHOT.members.find(
                        (m) => m.userId === f.userId,
                      )?.displayName,
                  )
                  .join(', ') || 'Nobody'}
              </Text>
              <Group>
                <Button
                  variant={mine ? 'default' : 'filled'}
                  onClick={() =>
                    setFavorites((current) =>
                      mine
                        ? current.filter(
                            (f) =>
                              !(
                                f.listingId === listing.id &&
                                f.userId === DEMO_USER_ID
                              ),
                          )
                        : [
                            ...current,
                            {
                              householdId: DEMO_HOUSEHOLD_ID,
                              listingId: listing.id,
                              userId: DEMO_USER_ID,
                              savedAt: new Date().toISOString(),
                            },
                          ],
                    )
                  }
                >
                  {mine ? 'Remove my favorite' : 'Favorite'}
                </Button>
                <a
                  href={listing.sourceUrls[0]}
                  target="_blank"
                  rel="noreferrer"
                >
                  Fictional original listing
                </a>
              </Group>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
