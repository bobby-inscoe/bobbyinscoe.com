import { Info, Snail } from 'lucide-react';
import type React from 'react';
import { AvatarArt } from '@/features/duck-feed/components/avatar-art';
import { DuckIcon } from '@/features/duck-feed/components/icons/duck-icon';
import type { Avatar, Difficulty } from '@/features/duck-feed/types/game';
import {
  AVATAR_LABELS,
  AVATARS,
  DUCK_COLOR,
  SNAIL_COLOR,
} from '@/features/duck-feed/utils/avatars';
import {
  DIFFICULTIES,
  DIFFICULTY_SETTINGS,
  ROUND_DURATIONS_SECONDS,
  type RoundDurationSeconds,
} from '@/features/duck-feed/utils/difficulty';

const DIFFICULTY_EXPLANATION =
  'Higher difficulty shrinks how close you need to get before the feed flees, makes it wait longer before it can flee again, and shortens your combo window. The catch radius also keeps shrinking as the round goes on.';

interface StartScreenProps {
  avatar: Avatar;
  onAvatarChange: (avatar: Avatar) => void;
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  durationSeconds: RoundDurationSeconds;
  onDurationChange: (durationSeconds: RoundDurationSeconds) => void;
  canStart: boolean;
  onStart: () => void;
}

export function StartScreen({
  avatar,
  onAvatarChange,
  difficulty,
  onDifficultyChange,
  durationSeconds,
  onDurationChange,
  canStart,
  onStart,
}: StartScreenProps): React.JSX.Element {
  return (
    <div className="StartScreen">
      <AvatarArt avatar={avatar} />
      <fieldset className="StartScreen-field">
        <legend>Avatar</legend>
        {AVATARS.map((option) => (
          <label key={option} className="StartScreen-option">
            <input
              type="radio"
              name="avatar"
              value={option}
              checked={avatar === option}
              onChange={() => onAvatarChange(option)}
            />
            {option === 'duck' ? (
              <DuckIcon
                className="StartScreen-avatarIcon"
                size={16}
                strokeWidth={1.75}
                color={DUCK_COLOR}
              />
            ) : (
              <Snail
                className="StartScreen-avatarIcon"
                size={16}
                strokeWidth={1.75}
                color={SNAIL_COLOR}
              />
            )}
            {AVATAR_LABELS[option]}
          </label>
        ))}
      </fieldset>
      <fieldset className="StartScreen-field">
        <legend className="StartScreen-legend">
          Difficulty
          <span
            className="StartScreen-info"
            role="img"
            aria-label={DIFFICULTY_EXPLANATION}
            title={DIFFICULTY_EXPLANATION}
          >
            <Info size={14} strokeWidth={2} aria-hidden="true" />
          </span>
        </legend>
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
    </div>
  );
}
