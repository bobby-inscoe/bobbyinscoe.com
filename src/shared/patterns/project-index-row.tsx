import { Link } from '@tanstack/react-router';
import type React from 'react';

import classes from '@/shared/patterns/project-index-row.module.css';
import type { ProjectRecord } from '@/shared/projects/types';
import { Meta } from '@/shared/ui/meta';

export interface ProjectIndexRowProps {
  project: ProjectRecord;
}

export function ProjectIndexRow({
  project,
}: ProjectIndexRowProps): React.JSX.Element {
  const isInProgress = project.status === 'in-progress';

  return (
    <tr className={classes.row}>
      <td className={classes.title}>
        <span
          aria-hidden="true"
          className={classes.node}
          data-hollow={isInProgress}
        />
        {project.route ? (
          <Link className={classes.link} to={project.route}>
            {project.title}
          </Link>
        ) : (
          <span>{project.title}</span>
        )}
      </td>
      <td className={classes.tabular}>{project.year}</td>
      <td className={classes.cell}>{project.kind}</td>
      <td className={classes.cell}>{project.tags.join(', ')}</td>
      <td>
        <Meta>{isInProgress ? 'In progress' : 'Live'}</Meta>
      </td>
    </tr>
  );
}
