export type GameStatus = 'idle' | 'playing' | 'bonus-phase' | 'game-over';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type Avatar = 'duck' | 'snail';

export interface Position {
  x: number;
  y: number;
}

export interface BoardSize {
  width: number;
  height: number;
}

export type FeedItemKind = 'normal' | 'bonus-pickup' | 'crumb';

export interface FeedItem {
  id: string;
  kind: FeedItemKind;
  position: Position;
  lastMovedAt: number;
}

export interface RoundResult {
  score: number;
  bestCombo: number;
  bonusTimeGainedMs: number;
  isNewHighScore: boolean;
}

export type PopupKind = 'catch' | 'time-bonus';

export interface Popup {
  id: string;
  kind: PopupKind;
  position: Position;
  createdAt: number;
}
