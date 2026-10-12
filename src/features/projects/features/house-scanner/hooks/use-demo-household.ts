import { useState } from 'react';

import {
  DEMO_USER_ID,
  SYNTHETIC_SNAPSHOT,
} from '@/features/projects/features/house-scanner/mock/synthetic-household';
import type {
  ManualSubmission,
  SearchProfile,
  Snapshot,
} from '@/features/projects/features/house-scanner/types/contracts';
import { normalizeManualUrl } from '@/features/projects/features/house-scanner/utils/workspace-view';

export function useDemoHousehold() {
  const [snapshot, setSnapshot] = useState<Snapshot>(() =>
    structuredClone(SYNTHETIC_SNAPSHOT),
  );
  async function saveFavorite(listingId: string) {
    setSnapshot((current) =>
      current.favorites.some(
        (favorite) =>
          favorite.listingId === listingId && favorite.userId === DEMO_USER_ID,
      )
        ? current
        : {
            ...current,
            favorites: [
              ...current.favorites,
              {
                householdId: current.householdId,
                listingId,
                userId: DEMO_USER_ID,
                savedAt: new Date().toISOString(),
              },
            ],
          },
    );
  }
  async function removeFavorite(listingId: string) {
    setSnapshot((current) => ({
      ...current,
      favorites: current.favorites.filter(
        (favorite) =>
          favorite.listingId !== listingId || favorite.userId !== DEMO_USER_ID,
      ),
    }));
  }
  async function addManual(submission: ManualSubmission) {
    const url = normalizeManualUrl(submission.url);
    const now = new Date().toISOString();
    setSnapshot((current) => {
      if (
        current.listings.some((listing) =>
          listing.sourceUrls.some(
            (sourceUrl) => normalizeManualUrl(sourceUrl) === url,
          ),
        )
      )
        return current;
      return {
        ...current,
        listings: [
          ...current.listings,
          {
            id: crypto.randomUUID(),
            householdId: current.householdId,
            origin: 'manual',
            title: submission.title || new URL(url).hostname,
            sourceUrls: [url],
            facts: {
              propertyType: null,
              tenure: 'unknown',
              purchase: null,
              livingAreaM2: null,
              secondaryAreaM2: null,
              rooms: null,
              askingPriceSek: null,
              groundFloor: null,
              lift: null,
              liftServesHome: null,
              stepFree: null,
              outdoor: null,
              glazed: null,
              largePrivateTerrace: null,
              municipality: null,
              baseFeeSek: null,
              mandatoryMonthlySek: null,
              status: 'unknown',
            },
            conflicts: [],
            coordinates: null,
            photo: null,
            previousAskingPriceSek: null,
            observedAt: now,
            addedBy: DEMO_USER_ID,
            userTags: submission.tags,
            evidence: Array.from(
              { length: Math.ceil(submission.note.length / 1000) },
              (_, index) => ({
                id: crypto.randomUUID(),
                kind: 'buyer_observation' as const,
                subject: 'facts' as const,
                summary: submission.note.slice(
                  index * 1000,
                  (index + 1) * 1000,
                ),
                sourceUrl: null,
                observedAt: now,
                datasetVersion: null,
                method: `Demo-only note by Demo Alex, part ${index + 1} of ${Math.ceil(submission.note.length / 1000)}`,
                value: null,
                unit: null,
              }),
            ),
          },
        ],
      };
    });
  }
  async function saveProfile(profile: SearchProfile) {
    setSnapshot((current) => ({
      ...current,
      profiles: current.profiles.map((existing) =>
        existing.id === profile.id && existing.revision === profile.revision
          ? {
              ...profile,
              revision: existing.revision + 1,
              editedBy: DEMO_USER_ID,
              editedAt: new Date().toISOString(),
            }
          : existing,
      ),
    }));
  }
  return { snapshot, saveFavorite, removeFavorite, addManual, saveProfile };
}
