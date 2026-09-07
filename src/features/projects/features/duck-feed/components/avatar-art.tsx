import { Leaf, Snail } from 'lucide-react';
import type React from 'react';
import classes from '@/features/projects/features/duck-feed/components/avatar-art.module.css';
import {
  LEAF_ICON_COLOR,
  SNAIL_ICON_COLOR,
  WHEAT_ICON_COLOR,
} from '@/features/projects/features/duck-feed/components/avatar-colors';
import { DuckIcon } from '@/features/projects/features/duck-feed/components/icons/duck-icon';
import { WheatIcon } from '@/features/projects/features/duck-feed/components/icons/wheat-icon';
import type { Avatar } from '@/features/projects/features/duck-feed/types/game';

interface AvatarArtProps {
  avatar: Avatar;
}

export function AvatarArt({ avatar }: AvatarArtProps): React.JSX.Element {
  if (avatar === 'snail') {
    return (
      <div className={classes.avatarArt} aria-hidden="true">
        <Snail size={48} strokeWidth={1.5} color={SNAIL_ICON_COLOR} />
        <Leaf size={40} strokeWidth={1.5} color={LEAF_ICON_COLOR} />
      </div>
    );
  }

  return (
    <div className={classes.avatarArt} aria-hidden="true">
      <DuckIcon useOriginalArt size={48} strokeWidth={1.5} />
      <WheatIcon size={40} strokeWidth={1.5} color={WHEAT_ICON_COLOR} />
    </div>
  );
}
