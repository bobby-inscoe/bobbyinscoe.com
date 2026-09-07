/*
 * Token-backed replacements for the hex constants in utils/avatars.ts, which
 * phase 7 must not modify (see docs/decisions.md). DUCK_COLOR has no
 * equivalent here: every call site renders DuckIcon with useOriginalArt,
 * which ignores the color prop entirely, so the duck never needed one.
 */
export const SNAIL_ICON_COLOR = 'var(--site-warning)';
export const LEAF_ICON_COLOR = 'var(--site-success)';
export const WHEAT_ICON_COLOR = 'var(--site-accent)';
