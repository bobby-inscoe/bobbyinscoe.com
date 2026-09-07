import type React from 'react';

import classes from '@/features/projects/features/duck-feed/components/high-score-list.module.css';
import { Plate } from '@/shared/ui/plate';

interface HighScoreListProps {
  scores: number[];
}

export function HighScoreList({
  scores,
}: HighScoreListProps): React.JSX.Element {
  return (
    <Plate>
      <div className={classes.highScoreList}>
        <h2 className={classes.heading}>High Scores</h2>
        {scores.length === 0 ? (
          <p className={classes.empty}>No rounds played yet — set one!</p>
        ) : (
          <ol className={classes.items}>
            {scores.map((score, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rank position is the stable identity here, not the score value.
              <li key={index}>
                <span>{index + 1}</span>
                <span>{score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Plate>
  );
}
