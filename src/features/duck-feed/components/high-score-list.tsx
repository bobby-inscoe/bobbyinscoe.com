import type React from 'react';

interface HighScoreListProps {
  scores: number[];
}

export function HighScoreList({
  scores,
}: HighScoreListProps): React.JSX.Element {
  return (
    <div className="HighScoreList">
      <h2>High Scores</h2>
      {scores.length === 0 ? (
        <p className="HighScoreList-empty">No rounds played yet — set one!</p>
      ) : (
        <ol className="HighScoreList-items">
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
  );
}
