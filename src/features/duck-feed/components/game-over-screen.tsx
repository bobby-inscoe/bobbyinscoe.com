import type React from 'react';

import type { RoundResult } from '@/features/duck-feed/types/game';

interface GameOverScreenProps {
  result: RoundResult;
  onPlayAgain: () => void;
  onChangeSettings: () => void;
}

export function GameOverScreen({
  result,
  onPlayAgain,
  onChangeSettings,
}: GameOverScreenProps): React.JSX.Element {
  return (
    <div
      className="GameOverScreen"
      role="alertdialog"
      aria-labelledby="duck-feed-game-over-heading"
    >
      <h2 id="duck-feed-game-over-heading">Round over!</h2>
      <p className="GameOverScreen-score">{result.score} points</p>
      {result.isNewHighScore && (
        <p className="GameOverScreen-badge">New high score!</p>
      )}
      <dl className="GameOverScreen-stats">
        <div>
          <dt>Best combo</dt>
          <dd>x{result.bestCombo}</dd>
        </div>
        <div>
          <dt>Bonus time gained</dt>
          <dd>{(result.bonusTimeGainedMs / 1000).toFixed(2)}s</dd>
        </div>
      </dl>
      <div className="GameOverScreen-actions">
        <button type="button" className="Button" onClick={onPlayAgain}>
          Play Again
        </button>
        <button
          type="button"
          className="Button Button--secondary"
          onClick={onChangeSettings}
        >
          Change Settings
        </button>
      </div>
    </div>
  );
}
