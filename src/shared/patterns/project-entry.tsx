import { Link } from '@tanstack/react-router';
import type React from 'react';

import classes from '@/shared/patterns/project-entry.module.css';
import type { ProjectRecord } from '@/shared/projects/types';
import { Meta } from '@/shared/ui/meta';
import { Plate } from '@/shared/ui/plate';
import { Prose } from '@/shared/ui/prose';

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
  const isPlated = project.presentation !== 'text';

  const content = (
    <div className={classes.inner}>
      <span className={classes.index}>{String(index).padStart(2, '0')}</span>
      <div className={classes.body}>
        <h3 className={classes.title}>
          {project.route ? (
            <Link className={classes.titleLink} to={project.route}>
              {project.title}
            </Link>
          ) : (
            project.title
          )}
        </h3>
        <Meta>
          {project.kind} &middot; {project.year} &middot;{' '}
          {isInProgress ? 'In progress' : 'Live'}
        </Meta>
        <Prose>
          <p>{project.blurb}</p>
        </Prose>
      </div>
    </div>
  );

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
      {isPlated ? <Plate>{content}</Plate> : content}
    </li>
  );
}
