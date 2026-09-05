import { Leaf, Snail } from 'lucide-react';
import type React from 'react';
import { DuckIcon } from '@/features/duck-feed/components/icons/duck-icon';
import { WheatIcon } from '@/features/duck-feed/components/icons/wheat-icon';
import type { Avatar } from '@/features/duck-feed/types/game';
import {
  DUCK_COLOR,
  LEAF_COLOR,
  SNAIL_COLOR,
  WHEAT_COLOR,
} from '@/features/duck-feed/utils/avatars';

interface AvatarArtProps {
  avatar: Avatar;
}

export function AvatarArt({ avatar }: AvatarArtProps): React.JSX.Element {
  if (avatar === 'snail') {
    return (
      <div className="AvatarArt" aria-hidden="true">
        <Snail size={48} strokeWidth={1.5} color={SNAIL_COLOR} />
        <Leaf size={40} strokeWidth={1.5} color={LEAF_COLOR} />
      </div>
    );
  }

  return (
    <div className="AvatarArt" aria-hidden="true">
      <DuckIcon size={48} strokeWidth={1.5} color={DUCK_COLOR} />
      <WheatIcon size={40} strokeWidth={1.5} color={WHEAT_COLOR} />
    </div>
  );
}
