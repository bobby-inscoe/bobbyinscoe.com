import { Snail } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

import { SNAIL_ICON_COLOR } from '@/features/projects/features/duck-feed/components/avatar-colors';
import { CatchPopup } from '@/features/projects/features/duck-feed/components/catch-popup';
import { FeedItem } from '@/features/projects/features/duck-feed/components/feed-item';
import classes from '@/features/projects/features/duck-feed/components/game-board.module.css';
import { DuckIcon } from '@/features/projects/features/duck-feed/components/icons/duck-icon';
import type {
  Avatar,
  FeedItem as FeedItemModel,
  Popup,
  Position,
} from '@/features/projects/features/duck-feed/types/game';

interface GameBoardProps {
  ref: React.Ref<HTMLDivElement>;
  avatar: Avatar;
  feedItems: FeedItemModel[];
  popups: Popup[];
  isBonusPhase: boolean;
  onPointerMove: (position: Position) => void;
  onItemActivate: (id: string) => void;
}

function positionFromPoint(
  bounds: DOMRect,
  clientX: number,
  clientY: number,
): Position {
  return { x: clientX - bounds.left, y: clientY - bounds.top };
}

export function GameBoard({
  ref,
  avatar,
  feedItems,
  popups,
  isBonusPhase,
  onPointerMove,
  onItemActivate,
}: GameBoardProps): React.JSX.Element {
  const [cursorPos, setCursorPos] = useState<Position | null>(null);
  const pendingPositionRef = useRef<Position | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    },
    [],
  );

  /*
   * touchmove can fire far more often than mousemove ever did, especially
   * for a near-stationary finger, and each call reaches the game's
   * proximity-catch logic. Uncapped, that read as items spawning
   * exponentially under touch: a light touch-and-hold could fire dozens of
   * catches a second, which then compounds as more items appear nearby and
   * the thread falls further behind. Coalescing to one call per animation
   * frame caps it at display refresh rate regardless of raw event volume.
   * The cursor avatar still updates every event, since that cost is just a
   * style attribute, not a game-state change.
   */
  function reportPosition(position: Position): void {
    setCursorPos(position);
    pendingPositionRef.current = position;
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const pending = pendingPositionRef.current;
      if (pending) onPointerMove(pending);
    });
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: this tracks pointer position for the game's proximity mechanic; every feed item is independently reachable and activatable via keyboard focus.
    <div
      ref={ref}
      className={classes.board}
      data-bonus-phase={isBonusPhase}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        reportPosition(positionFromPoint(bounds, event.clientX, event.clientY));
      }}
      onMouseLeave={() => setCursorPos(null)}
      onTouchMove={(event) => {
        const touch = event.touches[0];
        if (!touch) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        reportPosition(positionFromPoint(bounds, touch.clientX, touch.clientY));
      }}
      onTouchEnd={() => setCursorPos(null)}
      onTouchCancel={() => setCursorPos(null)}
    >
      {feedItems.map((item) => (
        <FeedItem
          key={item.id}
          item={item}
          avatar={avatar}
          muted={isBonusPhase && item.kind === 'normal'}
          onActivate={onItemActivate}
        />
      ))}
      {popups.map((popup) => (
        <CatchPopup key={popup.id} popup={popup} />
      ))}
      {cursorPos && (
        <span
          className={classes.cursorAvatar}
          style={{ left: cursorPos.x, top: cursorPos.y }}
        >
          {avatar === 'snail' ? (
            <Snail size={28} strokeWidth={1.75} color={SNAIL_ICON_COLOR} />
          ) : (
            <DuckIcon useOriginalArt size={28} strokeWidth={1.75} />
          )}
        </span>
      )}
    </div>
  );
}
