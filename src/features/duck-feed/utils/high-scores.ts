export const HIGH_SCORE_LIMIT = 5;
export const HIGH_SCORES_STORAGE_KEY = 'duck-feed:high-scores';

/** Boundary validation: localStorage content is untrusted until proven to be finite numbers. */
export function parseHighScores(raw: string | null): number[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value),
    )
    .sort((a, b) => b - a)
    .slice(0, HIGH_SCORE_LIMIT);
}

export function insertHighScore(scores: number[], score: number): number[] {
  return [...scores, score].sort((a, b) => b - a).slice(0, HIGH_SCORE_LIMIT);
}

export function wouldBeNewHighScore(scores: number[], score: number): boolean {
  if (scores.length < HIGH_SCORE_LIMIT) return true;
  const lowest = scores[scores.length - 1];
  return lowest === undefined || score > lowest;
}
