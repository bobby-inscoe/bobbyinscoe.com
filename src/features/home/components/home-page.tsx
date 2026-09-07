import type React from 'react';
import { useMemo } from 'react';

import classes from '@/features/home/components/home-page.module.css';
import { useThreadAnchors } from '@/features/home/hooks/use-thread-anchors';
import { ProjectEntry } from '@/shared/patterns/project-entry';
import { PROJECTS } from '@/shared/projects/registry';
import { Prose } from '@/shared/ui/prose';
import { Reveal } from '@/shared/ui/reveal';
import { Rule } from '@/shared/ui/rule';
import { ThreadSpine } from '@/shared/ui/thread-spine';

const COLLECTION_HEADING_ID = 'collection';

export function HomePage(): React.JSX.Element {
  const anchorSources = useMemo(
    () =>
      PROJECTS.map((project) => ({
        id: project.id,
        filled: project.status === 'live',
      })),
    [],
  );
  const { anchors, registerAnchor } = useThreadAnchors(anchorSources);

  return (
    <div className={classes.page}>
      <Reveal index={0}>
        <header className={classes.masthead}>
          <h1 className={classes.title}>Bobby Inscoe</h1>
          {/* TODO(human): the homepage opening copy. */}
        </header>
      </Reveal>

      <Reveal index={1}>
        <Rule />
      </Reveal>

      <Reveal index={2}>
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
              <div className={classes.threaded}>
                <ThreadSpine anchors={anchors} />
                <ol className={classes.list}>
                  {PROJECTS.map((project, i) => (
                    <ProjectEntry
                      anchorRef={registerAnchor(project.id)}
                      index={i + 1}
                      key={project.id}
                      project={project}
                    />
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>
      </Reveal>

      <Reveal index={3}>
        <Rule />
      </Reveal>

      {/* TODO(human): the homepage closing copy. */}
    </div>
  );
}
