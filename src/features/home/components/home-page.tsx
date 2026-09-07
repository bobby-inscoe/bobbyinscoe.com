import type React from 'react';

import classes from '@/features/home/components/home-page.module.css';
import { ProjectEntry } from '@/shared/patterns/project-entry';
import { PROJECTS } from '@/shared/projects/registry';

/*
 * ThreadSpine (phase 5) will collect each entry's anchorRef to measure the
 * thread's path from the DOM. Until it exists there is nothing to measure
 * into, so every entry passes null; the prop is required by ProjectEntry's
 * signature regardless of whether a consumer is mounted yet.
 */
export function HomePage(): React.JSX.Element {
  return (
    <div className={classes.page}>
      <h1>Bobby Inscoe</h1>
      {PROJECTS.length === 0 ? (
        <p>No projects yet.</p>
      ) : (
        <ol className={classes.list}>
          {PROJECTS.map((project, i) => (
            <ProjectEntry
              anchorRef={null}
              index={i + 1}
              key={project.id}
              project={project}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
