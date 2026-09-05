import type React from 'react';

import { HighScoreList } from '@/features/duck-feed/components/high-score-list';
import type { Difficulty } from '@/features/duck-feed/types/game';
import {
  DIFFICULTIES,
  DIFFICULTY_SETTINGS,
  ROUND_DURATIONS_SECONDS,
  type RoundDurationSeconds,
} from '@/features/duck-feed/utils/difficulty';

interface StartScreenProps {
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  durationSeconds: RoundDurationSeconds;
  onDurationChange: (durationSeconds: RoundDurationSeconds) => void;
  highScores: number[];
  canStart: boolean;
  onStart: () => void;
}

export function StartScreen({
  difficulty,
  onDifficultyChange,
  durationSeconds,
  onDurationChange,
  highScores,
  canStart,
  onStart,
}: StartScreenProps): React.JSX.Element {
  return (
    <div className="StartScreen">
      <fieldset className="StartScreen-field">
        <legend>Difficulty</legend>
        {DIFFICULTIES.map((tier) => (
          <label key={tier} className="StartScreen-option">
            <input
              type="radio"
              name="difficulty"
              value={tier}
              checked={difficulty === tier}
              onChange={() => onDifficultyChange(tier)}
            />
            {DIFFICULTY_SETTINGS[tier].label}
          </label>
        ))}
      </fieldset>
      <fieldset className="StartScreen-field">
        <legend>Round length</legend>
        {ROUND_DURATIONS_SECONDS.map((seconds) => (
          <label key={seconds} className="StartScreen-option">
            <input
              type="radio"
              name="duration"
              value={seconds}
              checked={durationSeconds === seconds}
              onChange={() => onDurationChange(seconds)}
            />
            {seconds}s
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className="Button"
        onClick={onStart}
        disabled={!canStart}
      >
        {canStart ? 'Start Game' : 'Measuring board…'}
      </button>
      <HighScoreList scores={highScores} />
    </div>
  );
}
