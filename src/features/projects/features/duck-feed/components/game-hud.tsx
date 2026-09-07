import type React from 'react';

import classes from '@/features/projects/features/duck-feed/components/game-hud.module.css';
import { useNow } from '@/features/projects/features/duck-feed/hooks/use-now';

type UrgencyTier = 'normal' | 'warning' | 'critical';

const WARNING_RATIO = 0.25;
const CRITICAL_RATIO = 0.1;
const BONUS_TICK_MS = 100;

function urgencyTier(remainingMs: number, durationMs: number): UrgencyTier {
  if (durationMs <= 0) return 'normal';
  const ratio = remainingMs / durationMs;
  if (ratio <= CRITICAL_RATIO) return 'critical';
  if (ratio <= WARNING_RATIO) return 'warning';
  return 'normal';
}

interface GameHudProps {
  score: number;
  comboCount: number;
  remainingMs: number;
  durationMs: number;
  isBonusPhase: boolean;
  bonusPhaseEndsAt: number | null;
  bonusPhaseDurationMs: number;
  bestScore: number | null;
}

export function GameHud({
  score,
  comboCount,
  remainingMs,
  durationMs,
  isBonusPhase,
  bonusPhaseEndsAt,
  bonusPhaseDurationMs,
  bestScore,
}: GameHudProps): React.JSX.Element {
  const secondsRemaining = Math.max(remainingMs, 0) / 1000;
  const now = useNow(BONUS_TICK_MS, isBonusPhase && bonusPhaseEndsAt !== null);
  const bonusMsRemaining =
    bonusPhaseEndsAt !== null
      ? Math.max(bonusPhaseEndsAt - now, 0)
      : bonusPhaseDurationMs;
  const bonusProgress =
    bonusPhaseDurationMs > 0 ? bonusMsRemaining / bonusPhaseDurationMs : 0;

  return (
    <div className={classes.hud}>
      <div className={classes.row}>
        <div className={classes.stat}>
          <span className={classes.label}>Score</span>
          <span className={classes.value}>{score}</span>
        </div>
        {comboCount > 1 && (
          <div className={classes.stat} data-variant="combo">
            <span className={classes.label}>Combo</span>
            <span className={classes.value}>x{comboCount}</span>
          </div>
        )}
        <div
          className={classes.stat}
          data-urgency={urgencyTier(remainingMs, durationMs)}
          data-paused={isBonusPhase}
        >
          <span className={classes.label}>
            {isBonusPhase ? 'Time (paused)' : 'Time'}
          </span>
          <span className={classes.value}>{secondsRemaining.toFixed(1)}s</span>
        </div>
        {isBonusPhase && (
          <div className={classes.stat} data-variant="bonus">
            <span className={classes.label}>Bonus phase</span>
            <span className={classes.value}>
              {(bonusMsRemaining / 1000).toFixed(1)}s
            </span>
          </div>
        )}
        {bestScore !== null && (
          <div className={classes.stat}>
            <span className={classes.label}>Best</span>
            <span className={classes.value}>{bestScore}</span>
          </div>
        )}
      </div>
      {isBonusPhase && (
        <div className={classes.bonusBar}>
          <div
            className={classes.bonusBarFill}
            style={{ width: `${bonusProgress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
