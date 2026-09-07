export type ProjectMode = 'document' | 'application' | 'immersive';
export type EntryPresentation = 'plate' | 'text' | 'canvas';

interface ProjectBase {
  id: string;
  title: string;
  blurb: string;
  year: number;
  kind: string;
  tags: readonly string[];
}

export interface LiveProject extends ProjectBase {
  status: 'live';
  presentation: EntryPresentation;
  mode: ProjectMode;
  route: string;
  /** One hex. Must clear 4.5:1 on #10171C. */
  accent: string | null;
  /** Required when mode is 'document'. Must clear 4.5:1 on #D6D3C8. */
  accentLight: string | null;
}

export interface InProgressProject extends ProjectBase {
  status: 'in-progress';
  /** In-progress entries are always terse text. Never a plate or a canvas. */
  presentation: 'text';
  /** null renders a paragraph instead of a link. */
  route: string | null;
}

export type ProjectRecord = LiveProject | InProgressProject;
