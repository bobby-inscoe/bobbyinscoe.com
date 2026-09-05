import type React from 'react';

import { useNow } from '@/features/duck-feed/hooks/use-now';

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
    <div className="GameHud">
      <div className="GameHud-row">
        <div className="GameHud-stat">
          <span className="GameHud-label">Score</span>
          <span className="GameHud-value">{score}</span>
        </div>
        {comboCount > 1 && (
          <div className="GameHud-stat GameHud-combo">
            <span className="GameHud-label">Combo</span>
            <span className="GameHud-value">x{comboCount}</span>
          </div>
        )}
        <div
          className={`GameHud-stat GameHud-timer GameHud-timer--${urgencyTier(remainingMs, durationMs)}${isBonusPhase ? ' GameHud-timer--paused' : ''}`}
        >
          <span className="GameHud-label">
            {isBonusPhase ? 'Time (paused)' : 'Time'}
          </span>
          <span className="GameHud-value">{secondsRemaining.toFixed(1)}s</span>
        </div>
        {isBonusPhase && (
          <div className="GameHud-stat GameHud-bonus">
            <span className="GameHud-label">Bonus phase</span>
            <span className="GameHud-value">
              {(bonusMsRemaining / 1000).toFixed(1)}s
            </span>
          </div>
        )}
        {bestScore !== null && (
          <div className="GameHud-stat">
            <span className="GameHud-label">Best</span>
            <span className="GameHud-value">{bestScore}</span>
          </div>
        )}
      </div>
      {isBonusPhase && (
        <div className="GameHud-bonusBar">
          <div
            className="GameHud-bonusBar-fill"
            style={{ width: `${bonusProgress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
