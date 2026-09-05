import { useCallback, useEffect, useRef, useState } from 'react';

import {
  HIGH_SCORES_STORAGE_KEY,
  insertHighScore,
  parseHighScores,
  wouldBeNewHighScore,
} from '@/features/duck-feed/utils/high-scores';

function readStoredHighScores(): number[] {
  try {
    return parseHighScores(
      window.localStorage.getItem(HIGH_SCORES_STORAGE_KEY),
    );
  } catch {
    return [];
  }
}

export interface UseHighScoresResult {
  scores: number[];
  /** Records a finished round's score and reports whether it made the top 5. */
  recordScore: (score: number) => boolean;
}

export function useHighScores(): UseHighScoresResult {
  const [scores, setScores] = useState<number[]>(readStoredHighScores);
  const scoresRef = useRef(scores);
  scoresRef.current = scores;

  useEffect(() => {
    try {
      window.localStorage.setItem(
        HIGH_SCORES_STORAGE_KEY,
        JSON.stringify(scores),
      );
    } catch {
      // localStorage may be unavailable (private browsing, quota); scores just won't persist.
    }
  }, [scores]);

  const recordScore = useCallback((score: number): boolean => {
    const isNewHighScore = wouldBeNewHighScore(scoresRef.current, score);
    if (isNewHighScore) {
      const updated = insertHighScore(scoresRef.current, score);
      scoresRef.current = updated;
      setScores(updated);
    }
    return isNewHighScore;
  }, []);

  return { scores, recordScore };
}
