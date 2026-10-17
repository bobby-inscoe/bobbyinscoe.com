import { Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';

import styles from '@/features/house-scanner/components/household-workspace.module.css';
import type { Listing } from '@/features/house-scanner/types/contracts';

export function ListingPhoto({ listing }: { listing: Listing }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photo = listing.photo;
  const [expiryCheckAt, setExpiryCheckAt] = useState(Date.now);
  useEffect(() => {
    if (!photo) return;
    const remaining =
      Date.parse(photo.expiresAt) - Math.max(Date.now(), expiryCheckAt);
    if (remaining <= 0) return;
    const timeout = window.setTimeout(
      () => setExpiryCheckAt(Date.now()),
      Math.min(remaining, 2_147_483_647),
    );
    return () => window.clearTimeout(timeout);
  }, [photo, expiryCheckAt]);
  if (
    !photo ||
    failedUrl === photo.url ||
    Date.parse(photo.expiresAt) <= Date.now()
  )
    return (
      <div className={styles.placeholder}>No permitted photo available</div>
    );
  return (
    <Stack gap="xs">
      <a
        className={styles.photoLink}
        href={listing.sourceUrls[0]}
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
      >
        <img
          className={styles.photo}
          src={photo.url}
          alt={listing.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          width={550}
          height={366}
          onError={() => setFailedUrl(photo.url)}
        />
      </a>
      <Text size="xs">{photo.attribution}</Text>
    </Stack>
  );
}
