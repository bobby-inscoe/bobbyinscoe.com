import type React from 'react';
import { useState } from 'react';

import '@/features/duck-feed/components/duck-feed.css';

import { GameBoard } from '@/features/duck-feed/components/game-board';
import { GameHud } from '@/features/duck-feed/components/game-hud';
import { GameOverScreen } from '@/features/duck-feed/components/game-over-screen';
import { StartScreen } from '@/features/duck-feed/components/start-screen';
import { useDuckFeedGame } from '@/features/duck-feed/hooks/use-duck-feed-game';
import { useElementSize } from '@/features/duck-feed/hooks/use-element-size';
import { useHighScores } from '@/features/duck-feed/hooks/use-high-scores';
import type { Difficulty } from '@/features/duck-feed/types/game';
import type { RoundDurationSeconds } from '@/features/duck-feed/utils/difficulty';

interface DuckFeedProps {
  className?: string;
}

const DEFAULT_ROUND_DURATION_SECONDS: RoundDurationSeconds = 30;

export function DuckFeed({ className }: DuckFeedProps): React.JSX.Element {
  const { ref: boardRef, size: boardSize } = useElementSize<HTMLDivElement>();
  const highScores = useHighScores();
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
    <div className={`${className ?? ''} DuckFeed`}>
      <h1>Feed the Duck!</h1>
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
      <div className="DuckFeed-boardFrame">
        <GameBoard
          ref={boardRef}
          feedItems={game.feedItems}
          popups={game.popups}
          isBonusPhase={game.status === 'bonus-phase'}
          onPointerMove={game.handlePointerMove}
          onItemActivate={game.handleItemActivate}
        />
        {game.status === 'idle' && (
          <StartScreen
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            durationSeconds={durationSeconds}
            onDurationChange={setDurationSeconds}
            highScores={highScores.scores}
            canStart={boardSize.width > 0}
            onStart={game.start}
          />
        )}
        {game.status === 'game-over' && game.lastResult && (
          <GameOverScreen
            result={game.lastResult}
            onPlayAgain={game.start}
            onChangeSettings={game.returnToMenu}
          />
        )}
      </div>
    </div>
  );
}
