import { Select } from '@mantine/core';
import type React from 'react';
import { useMemo, useState } from 'react';

import classes from '@/features/projects/components/projects-index.module.css';
import { ProjectIndexRow } from '@/shared/patterns/project-index-row';
import { byTag, byYear } from '@/shared/projects/queries';
import { PROJECTS } from '@/shared/projects/registry';
import type { ProjectRecord } from '@/shared/projects/types';

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

/*
 * The archive lives here: a dense table, filterable by tag, year and kind,
 * keyboard-navigable. Mantine's Select already carries full keyboard
 * support; the table rows are plain links, reachable the same way.
 */
export function ProjectsIndex(): React.JSX.Element {
  const [tag, setTag] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [kind, setKind] = useState<string | null>(null);

  const tagOptions = useMemo(
    () => uniqueSorted(PROJECTS.flatMap((project) => project.tags)),
    [],
  );
  const yearOptions = useMemo(
    () =>
      uniqueSorted(PROJECTS.map((project) => String(project.year))).reverse(),
    [],
  );
  const kindOptions = useMemo(
    () => uniqueSorted(PROJECTS.map((project) => project.kind)),
    [],
  );

  const filtered = useMemo(() => {
    let result: readonly ProjectRecord[] = PROJECTS;
    if (tag) result = byTag(tag, result);
    if (year) result = byYear(Number(year), result);
    if (kind) result = result.filter((project) => project.kind === kind);
    return result;
  }, [tag, year, kind]);

  return (
    <div className={classes.page}>
      <h1>Projects</h1>
      <div className={classes.filters}>
        <Select
          clearable
          data={tagOptions}
          label="Tag"
          onChange={setTag}
          placeholder="All tags"
          value={tag}
        />
        <Select
          clearable
          data={yearOptions}
          label="Year"
          onChange={setYear}
          placeholder="All years"
          value={year}
        />
        <Select
          clearable
          data={kindOptions}
          label="Kind"
          onChange={setKind}
          placeholder="All kinds"
          value={kind}
        />
      </div>
      {filtered.length === 0 ? (
        <p>No projects match these filters.</p>
      ) : (
        <div className={classes.scroller}>
          <table className={classes.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Year</th>
                <th>Kind</th>
                <th>Tags</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <ProjectIndexRow key={project.id} project={project} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
