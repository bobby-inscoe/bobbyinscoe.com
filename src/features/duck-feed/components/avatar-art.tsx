import { Leaf, Snail } from 'lucide-react';
import type React from 'react';
import cereal from '@/features/duck-feed/assets/cereal.png';
import ducky from '@/features/duck-feed/assets/ducky.png';
import type { Avatar } from '@/features/duck-feed/types/game';

interface AvatarArtProps {
  avatar: Avatar;
}

export function AvatarArt({ avatar }: AvatarArtProps): React.JSX.Element {
  if (avatar === 'snail') {
    return (
      <div className="AvatarArt" aria-hidden="true">
        <Snail size={48} strokeWidth={1.5} color="green" />
        <Leaf size={40} strokeWidth={1.5} color="green" />
      </div>
    );
  }

  return (
    <div className="AvatarArt" aria-hidden="true">
      <img src={ducky} alt="" />
      <img src={cereal} alt="" />
    </div>
  );
}
