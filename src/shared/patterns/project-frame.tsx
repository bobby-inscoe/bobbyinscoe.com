import { Link } from '@tanstack/react-router';
import type React from 'react';

import classes from '@/shared/patterns/project-frame.module.css';
import type { ProjectMode } from '@/shared/projects/types';

export interface ProjectFrameProps {
  mode: ProjectMode;
  title: string;
  accent: string | null;
  accentLight: string | null;
  /** Route to return to. Always rendered, in every mode. */
  backTo: string;
  children: React.ReactNode;
}

interface ProjectFrameStyle extends React.CSSProperties {
  '--project-accent'?: string;
  '--project-accent-light'?: string;
}

export function ProjectFrame({
  mode,
  title,
  accent,
  accentLight,
  backTo,
  children,
}: ProjectFrameProps): React.JSX.Element {
  const style: ProjectFrameStyle = {};
  if (accent) style['--project-accent'] = accent;
  if (accentLight) style['--project-accent-light'] = accentLight;

  return (
    <article
      aria-label={title}
      className={classes.frame}
      data-mode={mode}
      style={style}
    >
      <Link className={classes.back} to={backTo}>
        Back to the collection
      </Link>
      {children}
    </article>
  );
}
