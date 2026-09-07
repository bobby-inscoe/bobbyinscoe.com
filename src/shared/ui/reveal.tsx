import type React from 'react';

import classes from '@/shared/ui/reveal.module.css';

/**
 * How many positions in a group stagger before everything remaining arrives
 * together. The spec's motion vocabulary caps the stagger at six items.
 */
const STAGGER_CAP = 6;

export interface RevealProps {
  children: React.ReactNode;
  /**
   * 0-based position within a revealed group. Later positions arrive later,
   * up to the cap; past it every item shares the last position's delay.
   */
  index?: number;
}

interface RevealStyle extends React.CSSProperties {
  '--reveal-order': number;
}

/*
 * The entrance reveal: opacity plus 6px of travel, once, on mount.
 *
 * The animation fills backwards, so an element waiting out its stagger sits at
 * the keyframe's opacity 0. That is also why the base rule does not set
 * opacity 0 itself: if the animation never runs at all, the element renders at
 * its natural opacity rather than staying invisible. A reveal must not be able
 * to hide content.
 */
export function Reveal({
  children,
  index = 0,
}: RevealProps): React.JSX.Element {
  const style: RevealStyle = {
    '--reveal-order': Math.min(index, STAGGER_CAP - 1),
  };

  return (
    <div className={classes.reveal} style={style}>
      {children}
    </div>
  );
}
