import { Link } from '@tanstack/react-router';
import type React from 'react';

import classes from '@/shared/patterns/project-entry.module.css';
import type { ProjectRecord } from '@/shared/projects/types';

export interface ProjectEntryProps {
  project: ProjectRecord;
  /** 1-based. Rendered as the entry's index in the collection. */
  index: number;
  /** ThreadSpine measures its anchor from this element. */
  anchorRef: React.Ref<HTMLElement>;
}

export function ProjectEntry({
  project,
  index,
  anchorRef,
}: ProjectEntryProps): React.JSX.Element {
  const isInProgress = project.status === 'in-progress';

  return (
    <li
      className={classes.entry}
      data-presentation={project.presentation}
      ref={anchorRef as React.Ref<HTMLLIElement>}
    >
      <span
        aria-hidden="true"
        className={classes.node}
        data-hollow={isInProgress}
      />
      <span className={classes.index}>{String(index).padStart(2, '0')}</span>
      <div className={classes.body}>
        <h2 className={classes.title}>
          {project.route ? (
            <Link className={classes.titleLink} to={project.route}>
              {project.title}
            </Link>
          ) : (
            project.title
          )}
        </h2>
        <p className={classes.meta}>
          {project.kind} &middot; {project.year}
          {isInProgress ? <> &middot; In progress</> : null}
        </p>
        <p className={classes.blurb}>{project.blurb}</p>
      </div>
    </li>
  );
}
