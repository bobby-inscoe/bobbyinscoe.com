import { Snail } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

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

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: this tracks pointer position for the game's proximity mechanic; every feed item is independently reachable and activatable via keyboard focus.
    <div
      ref={ref}
      className={classes.board}
      data-bonus-phase={isBonusPhase}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const position = positionFromPoint(
          bounds,
          event.clientX,
          event.clientY,
        );
        onPointerMove(position);
        setCursorPos(position);
      }}
      onMouseLeave={() => setCursorPos(null)}
      onTouchMove={(event) => {
        const touch = event.touches[0];
        if (!touch) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const position = positionFromPoint(
          bounds,
          touch.clientX,
          touch.clientY,
        );
        onPointerMove(position);
        setCursorPos(position);
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
