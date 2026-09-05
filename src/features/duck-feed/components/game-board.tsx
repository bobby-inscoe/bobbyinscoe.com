import type React from 'react';

import { CatchPopup } from '@/features/duck-feed/components/catch-popup';
import { FeedItem } from '@/features/duck-feed/components/feed-item';
import type {
  FeedItem as FeedItemModel,
  Popup,
  Position,
} from '@/features/duck-feed/types/game';

interface GameBoardProps {
  ref: React.Ref<HTMLDivElement>;
  feedItems: FeedItemModel[];
  popups: Popup[];
  isBonusPhase: boolean;
  onPointerMove: (position: Position) => void;
  onItemActivate: (id: string) => void;
}

export function GameBoard({
  ref,
  feedItems,
  popups,
  isBonusPhase,
  onPointerMove,
  onItemActivate,
}: GameBoardProps): React.JSX.Element {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: this tracks cursor position for the game's proximity mechanic; every feed item is independently reachable and activatable via keyboard focus.
    <div
      ref={ref}
      className={`GameBoard${isBonusPhase ? ' GameBoard--bonus-phase' : ''}`}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        onPointerMove({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        });
      }}
    >
      {feedItems.map((item) => (
        <FeedItem
          key={item.id}
          item={item}
          muted={isBonusPhase && item.kind === 'normal'}
          onActivate={onItemActivate}
        />
      ))}
      {popups.map((popup) => (
        <CatchPopup key={popup.id} popup={popup} />
      ))}
    </div>
  );
}
