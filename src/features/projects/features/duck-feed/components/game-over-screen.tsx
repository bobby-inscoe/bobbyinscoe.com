import { Button } from '@mantine/core';
import type React from 'react';

import { AvatarArt } from '@/features/projects/features/duck-feed/components/avatar-art';
import classes from '@/features/projects/features/duck-feed/components/game-over-screen.module.css';
import type {
  Avatar,
  RoundResult,
} from '@/features/projects/features/duck-feed/types/game';
import { Plate } from '@/shared/ui/plate';

interface GameOverScreenProps {
  avatar: Avatar;
  result: RoundResult;
  onPlayAgain: () => void;
  onChangeSettings: () => void;
}

export function GameOverScreen({
  avatar,
  result,
  onPlayAgain,
  onChangeSettings,
}: GameOverScreenProps): React.JSX.Element {
  return (
    <div
      className={classes.gameOverScreen}
      role="alertdialog"
      aria-labelledby="duck-feed-game-over-heading"
    >
      <Plate>
        <div className={classes.panel}>
          <AvatarArt avatar={avatar} />
          <h2 id="duck-feed-game-over-heading">Round over!</h2>
          <p className={classes.score}>{result.score} points</p>
          {result.isNewHighScore && (
            <p className={classes.badge}>New high score!</p>
          )}
          <dl className={classes.stats}>
            <div>
              <dt>Best combo</dt>
              <dd>x{result.bestCombo}</dd>
            </div>
            <div>
              <dt>Bonus time gained</dt>
              <dd>{(result.bonusTimeGainedMs / 1000).toFixed(2)}s</dd>
            </div>
          </dl>
          <div className={classes.actions}>
            <Button onClick={onPlayAgain}>Play Again</Button>
            <Button variant="default" onClick={onChangeSettings}>
              Change Settings
            </Button>
          </div>
        </div>
      </Plate>
    </div>
  );
}
