import { PROJECTS } from '@/shared/projects/registry';
import type { LiveProject, ProjectRecord } from '@/shared/projects/types';

export function liveProjects(
  projects: readonly ProjectRecord[] = PROJECTS,
): readonly LiveProject[] {
  return projects.filter(
    (project): project is LiveProject => project.status === 'live',
  );
}

export function byTag(
  tag: string,
  projects: readonly ProjectRecord[] = PROJECTS,
): readonly ProjectRecord[] {
  return projects.filter((project) => project.tags.includes(tag));
}

export function byYear(
  year: number,
  projects: readonly ProjectRecord[] = PROJECTS,
): readonly ProjectRecord[] {
  return projects.filter((project) => project.year === year);
}

export function byStatus(
  status: ProjectRecord['status'],
  projects: readonly ProjectRecord[] = PROJECTS,
): readonly ProjectRecord[] {
  return projects.filter((project) => project.status === status);
}
