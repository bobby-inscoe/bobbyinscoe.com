import type React from 'react';

import classes from '@/features/home/components/home-page.module.css';
import { ProjectEntry } from '@/shared/patterns/project-entry';
import { PROJECTS } from '@/shared/projects/registry';
import { Prose } from '@/shared/ui/prose';
import { Rule } from '@/shared/ui/rule';

const COLLECTION_HEADING_ID = 'collection';

/*
 * ThreadSpine (phase 5) will collect each entry's anchorRef to measure the
 * thread's path from the DOM. Until it exists there is nothing to measure
 * into, so every entry passes null; the prop is required by ProjectEntry's
 * signature regardless of whether a consumer is mounted yet.
 */
export function HomePage(): React.JSX.Element {
  return (
    <div className={classes.page}>
      <header className={classes.masthead}>
        <h1 className={classes.title}>Bobby Inscoe</h1>
        {/* TODO(human): the homepage opening copy. */}
      </header>

      <Rule />

      <section aria-labelledby={COLLECTION_HEADING_ID}>
        <div className={classes.collection}>
          <h2 className={classes.collectionTitle} id={COLLECTION_HEADING_ID}>
            The collection
          </h2>
          {PROJECTS.length === 0 ? (
            <Prose>
              <p>Nothing in the collection yet.</p>
            </Prose>
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
      </section>

      <Rule />

      {/* TODO(human): the homepage closing copy. */}
    </div>
  );
}
