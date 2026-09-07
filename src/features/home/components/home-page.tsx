import { Link } from '@tanstack/react-router';
import type React from 'react';

import classes from '@/features/home/components/home-page.module.css';
import { PROJECTS } from '@/shared/projects/registry';

/*
 * A bare list, on purpose. The collection page is phase 4's identity layer
 * and phase 3's ProjectEntry; nothing here is the design.
 */
export function HomePage(): React.JSX.Element {
  return (
    <div className={classes.page}>
      <h1>Bobby Inscoe</h1>
      {PROJECTS.length === 0 ? (
        <p>No projects yet.</p>
      ) : (
        <ul className={classes.list}>
          {PROJECTS.map((project) =>
            project.route === null ? (
              <li key={project.id}>{project.title}</li>
            ) : (
              <li key={project.id}>
                <Link className={classes.link} to={project.route}>
                  {project.title}
                </Link>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
