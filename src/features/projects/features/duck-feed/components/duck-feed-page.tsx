import type React from 'react';

import { DuckFeed } from '@/features/projects/features/duck-feed/components/duck-feed';
import { ProjectFrame } from '@/shared/patterns/project-frame';

/*
 * Mirrors the Duck Feed entry in src/shared/projects/registry.ts (title,
 * mode, accent, accentLight). Kept as literals rather than a registry
 * lookup so this page never depends on a find() succeeding; keep the two in
 * sync by hand if the registry entry changes.
 */
export function DuckFeedPage(): React.JSX.Element {
  return (
    <ProjectFrame
      accent={null}
      accentLight={null}
      backTo="/projects"
      mode="application"
      title="Duck Feed"
    >
      <DuckFeed />
    </ProjectFrame>
  );
}
