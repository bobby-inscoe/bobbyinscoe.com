export const BASE_FLEE_POINTS = 10;
export const COMBO_BONUS_POINTS = 5;
export const MAX_COMBO_MULTIPLIER = 8;

/** Points awarded for a flee, given the combo streak count it extends (1 = no streak yet). */
export function comboAward(comboCount: number): number {
  const cappedCombo = Math.min(comboCount, MAX_COMBO_MULTIPLIER);
  return BASE_FLEE_POINTS + (cappedCombo - 1) * COMBO_BONUS_POINTS;
}

export const BONUS_PICKUP_MIN_DELAY_MS = 6000;
export const BONUS_PICKUP_MAX_DELAY_MS = 12000;
export const BONUS_PICKUP_RADIUS_PX = 50;

export const BONUS_PHASE_DURATION_MS = 5000;
/** Crumbs in the flurry, maintained at all times: catching one immediately spawns its replacement. */
export const FLURRY_CRUMB_COUNT = 3;
export const CRUMB_PICKUP_RADIUS_PX = 40;
/** Minimum distance a freshly (re)spawned crumb must keep from the cursor. */
export const CRUMB_MIN_SEPARATION_PX = 40;
export const CRUMB_TIME_BONUS_MS = 100;

/** How long a catch/time-bonus popup stays on screen before it's pruned. */
export const POPUP_LIFETIME_MS = 700;

export function randomDelayMs(minMs: number, maxMs: number): number {
  return minMs + Math.random() * (maxMs - minMs);
}
