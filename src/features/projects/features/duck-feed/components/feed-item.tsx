import { Leaf } from 'lucide-react';
import type React from 'react';

import {
  LEAF_ICON_COLOR,
  WHEAT_ICON_COLOR,
} from '@/features/projects/features/duck-feed/components/avatar-colors';
import classes from '@/features/projects/features/duck-feed/components/feed-item.module.css';
import { WheatIcon } from '@/features/projects/features/duck-feed/components/icons/wheat-icon';
import type {
  Avatar,
  FeedItem as FeedItemModel,
} from '@/features/projects/features/duck-feed/types/game';
import { FEED_ITEM_SIZE_PX } from '@/features/projects/features/duck-feed/utils/constants';

interface FeedItemProps {
  item: FeedItemModel;
  avatar: Avatar;
  muted: boolean;
  onActivate: (id: string) => void;
}

function ariaLabel(kind: FeedItemModel['kind'], avatar: Avatar): string {
  switch (kind) {
    case 'normal':
      return avatar === 'duck' ? 'Feed the duck' : 'Feed the snail';
    case 'bonus-pickup':
      return 'Grab the bonus item';
    case 'crumb':
      return 'Grab the crumb';
  }
}

export function FeedItem({
  item,
  avatar,
  muted,
  onActivate,
}: FeedItemProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={ariaLabel(item.kind, avatar)}
      tabIndex={muted ? -1 : 0}
      className={classes.feedItem}
      data-kind={item.kind}
      data-muted={muted}
      style={{
        left: item.position.x,
        top: item.position.y,
        width: FEED_ITEM_SIZE_PX,
        height: FEED_ITEM_SIZE_PX,
      }}
      onFocus={() => onActivate(item.id)}
    >
      {avatar === 'snail' ? (
        <Leaf size={32} strokeWidth={1.75} color={LEAF_ICON_COLOR} />
      ) : (
        <WheatIcon size={32} strokeWidth={1.75} color={WHEAT_ICON_COLOR} />
      )}
    </button>
  );
}
