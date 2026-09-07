import type React from 'react';
import { useState } from 'react';

import classes from '@/features/projects/features/duck-feed/components/duck-feed.module.css';
import { GameBoard } from '@/features/projects/features/duck-feed/components/game-board';
import { GameHud } from '@/features/projects/features/duck-feed/components/game-hud';
import { GameOverScreen } from '@/features/projects/features/duck-feed/components/game-over-screen';
import { HighScoreList } from '@/features/projects/features/duck-feed/components/high-score-list';
import { StartScreen } from '@/features/projects/features/duck-feed/components/start-screen';
import { useDuckFeedGame } from '@/features/projects/features/duck-feed/hooks/use-duck-feed-game';
import { useElementSize } from '@/features/projects/features/duck-feed/hooks/use-element-size';
import { useHighScores } from '@/features/projects/features/duck-feed/hooks/use-high-scores';
import type {
  Avatar,
  Difficulty,
} from '@/features/projects/features/duck-feed/types/game';
import type { RoundDurationSeconds } from '@/features/projects/features/duck-feed/utils/difficulty';

interface DuckFeedProps {
  className?: string;
}

const DEFAULT_ROUND_DURATION_SECONDS: RoundDurationSeconds = 30;

export function DuckFeed({ className }: DuckFeedProps): React.JSX.Element {
  const { ref: boardRef, size: boardSize } = useElementSize<HTMLDivElement>();
  const highScores = useHighScores();
  const [avatar, setAvatar] = useState<Avatar>('duck');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [durationSeconds, setDurationSeconds] = useState<RoundDurationSeconds>(
    DEFAULT_ROUND_DURATION_SECONDS,
  );

  const game = useDuckFeedGame({
    boardSize,
    difficulty,
    durationSeconds,
    recordScore: highScores.recordScore,
  });

  return (
    <div className={[classes.duckFeed, className].filter(Boolean).join(' ')}>
      <h1 className={classes.title}>Feed the Duck!</h1>
      {game.status !== 'idle' && (
        <GameHud
          score={game.score}
          comboCount={game.comboCount}
          remainingMs={game.remainingMs}
          durationMs={game.durationMs}
          isBonusPhase={game.status === 'bonus-phase'}
          bonusPhaseEndsAt={game.bonusPhaseEndsAt}
          bonusPhaseDurationMs={game.bonusPhaseDurationMs}
          bestScore={highScores.scores[0] ?? null}
        />
      )}
      <div className={classes.boardFrame}>
        <GameBoard
          ref={boardRef}
          avatar={avatar}
          feedItems={game.feedItems}
          popups={game.popups}
          isBonusPhase={game.status === 'bonus-phase'}
          onPointerMove={game.handlePointerMove}
          onItemActivate={game.handleItemActivate}
        />
        {game.status === 'idle' && (
          <StartScreen
            avatar={avatar}
            onAvatarChange={setAvatar}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            durationSeconds={durationSeconds}
            onDurationChange={setDurationSeconds}
            canStart={boardSize.width > 0}
            onStart={game.start}
          />
        )}
        {game.status === 'game-over' && game.lastResult && (
          <GameOverScreen
            avatar={avatar}
            result={game.lastResult}
            onPlayAgain={game.start}
            onChangeSettings={game.returnToMenu}
          />
        )}
      </div>
      {game.status === 'idle' && (
        <div className={classes.highScores}>
          <HighScoreList scores={highScores.scores} />
        </div>
      )}
    </div>
  );
}
