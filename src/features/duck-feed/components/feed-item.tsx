import type React from 'react';

import type { FeedItem as FeedItemModel } from '@/features/duck-feed/types/game';
import { FEED_ITEM_SIZE_PX } from '@/features/duck-feed/utils/constants';

interface FeedItemProps {
  item: FeedItemModel;
  muted: boolean;
  onActivate: (id: string) => void;
}

const ARIA_LABEL_BY_KIND: Record<FeedItemModel['kind'], string> = {
  normal: 'Feed the duck',
  'bonus-pickup': 'Grab the bonus item',
  crumb: 'Grab the crumb',
};

export function FeedItem({
  item,
  muted,
  onActivate,
}: FeedItemProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={ARIA_LABEL_BY_KIND[item.kind]}
      tabIndex={muted ? -1 : 0}
      className={`FeedItem FeedItem--${item.kind}${item.kind === 'crumb' ? '' : ' shake'}${muted ? ' FeedItem--muted' : ''}`}
      style={{
        left: item.position.x,
        top: item.position.y,
        width: FEED_ITEM_SIZE_PX,
        height: FEED_ITEM_SIZE_PX,
      }}
      onFocus={() => onActivate(item.id)}
    />
  );
}
