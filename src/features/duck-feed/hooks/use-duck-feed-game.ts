import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { useCountdown } from '@/features/duck-feed/hooks/use-countdown';
import type {
  BoardSize,
  Difficulty,
  FeedItem,
  GameStatus,
  Popup,
  Position,
  RoundResult,
} from '@/features/duck-feed/types/game';
import { FEED_ITEM_SIZE_PX } from '@/features/duck-feed/utils/constants';
import type { RoundDurationSeconds } from '@/features/duck-feed/utils/difficulty';
import {
  DIFFICULTY_SETTINGS,
  escalatedFleeRadius,
} from '@/features/duck-feed/utils/difficulty';
import {
  distance,
  itemCenter,
  randomPosition,
  randomPositionAwayFrom,
} from '@/features/duck-feed/utils/geometry';
import {
  BONUS_PHASE_DURATION_MS,
  BONUS_PICKUP_MAX_DELAY_MS,
  BONUS_PICKUP_MIN_DELAY_MS,
  BONUS_PICKUP_RADIUS_PX,
  CRUMB_MIN_SEPARATION_PX,
  CRUMB_PICKUP_RADIUS_PX,
  CRUMB_TIME_BONUS_MS,
  comboAward,
  FLURRY_CRUMB_COUNT,
  POPUP_LIFETIME_MS,
  randomDelayMs,
} from '@/features/duck-feed/utils/scoring';

interface GameState {
  status: GameStatus;
  score: number;
  comboCount: number;
  bestCombo: number;
  bonusTimeGainedMs: number;
  feed: FeedItem | null;
  bonusPickup: FeedItem | null;
  crumbs: FeedItem[];
  bonusPhaseEndsAt: number | null;
  popups: Popup[];
  lastResult: RoundResult | null;
}

const initialState: GameState = {
  status: 'idle',
  score: 0,
  comboCount: 0,
  bestCombo: 0,
  bonusTimeGainedMs: 0,
  feed: null,
  bonusPickup: null,
  crumbs: [],
  bonusPhaseEndsAt: null,
  popups: [],
  lastResult: null,
};

function spawnCrumb(board: BoardSize, avoid: Position, now: number): FeedItem {
  return {
    id: crypto.randomUUID(),
    kind: 'crumb',
    position: randomPositionAwayFrom(board, avoid, CRUMB_MIN_SEPARATION_PX),
    lastMovedAt: now,
  };
}

type Action =
  | { type: 'start'; feed: FeedItem }
  | {
      type: 'relocate-feed';
      position: Position;
      now: number;
      points: number;
      comboCount: number;
    }
  | { type: 'reset-combo' }
  | { type: 'spawn-bonus-pickup'; item: FeedItem }
  | {
      type: 'collect-bonus-pickup';
      crumbs: FeedItem[];
      bonusPhaseEndsAt: number;
    }
  | { type: 'collect-crumbs'; caughtIds: string[]; replacements: FeedItem[] }
  | { type: 'end-bonus-phase' }
  | { type: 'add-popup'; popup: Popup }
  | { type: 'prune-popups'; now: number }
  | { type: 'end-round'; isNewHighScore: boolean }
  | { type: 'return-to-idle' };

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'start':
      return { ...initialState, status: 'playing', feed: action.feed };
    case 'relocate-feed': {
      if (!state.feed) return state;
      return {
        ...state,
        feed: {
          ...state.feed,
          position: action.position,
          lastMovedAt: action.now,
        },
        score: state.score + action.points,
        comboCount: action.comboCount,
        bestCombo: Math.max(state.bestCombo, action.comboCount),
      };
    }
    case 'reset-combo':
      return { ...state, comboCount: 0 };
    case 'spawn-bonus-pickup':
      return { ...state, bonusPickup: action.item };
    case 'collect-bonus-pickup':
      return {
        ...state,
        status: 'bonus-phase',
        bonusPickup: null,
        crumbs: action.crumbs,
        bonusPhaseEndsAt: action.bonusPhaseEndsAt,
      };
    case 'collect-crumbs':
      return {
        ...state,
        crumbs: [
          ...state.crumbs.filter((c) => !action.caughtIds.includes(c.id)),
          ...action.replacements,
        ],
        bonusTimeGainedMs:
          state.bonusTimeGainedMs +
          CRUMB_TIME_BONUS_MS * action.caughtIds.length,
      };
    case 'end-bonus-phase':
      return {
        ...state,
        status: 'playing',
        crumbs: [],
        bonusPhaseEndsAt: null,
      };
    case 'add-popup':
      return { ...state, popups: [...state.popups, action.popup] };
    case 'prune-popups':
      return {
        ...state,
        popups: state.popups.filter(
          (popup) => action.now - popup.createdAt < POPUP_LIFETIME_MS,
        ),
      };
    case 'end-round':
      return {
        ...state,
        status: 'game-over',
        lastResult: {
          score: state.score,
          bestCombo: state.bestCombo,
          bonusTimeGainedMs: state.bonusTimeGainedMs,
          isNewHighScore: action.isNewHighScore,
        },
      };
    case 'return-to-idle':
      return { ...initialState };
    default:
      return state;
  }
}

const GAME_TICK_MS = 150;

export interface UseDuckFeedGameOptions {
  boardSize: BoardSize;
  difficulty: Difficulty;
  durationSeconds: RoundDurationSeconds;
  recordScore: (score: number) => boolean;
}

export interface UseDuckFeedGameResult {
  status: GameStatus;
  score: number;
  comboCount: number;
  remainingMs: number;
  durationMs: number;
  bonusPhaseEndsAt: number | null;
  bonusPhaseDurationMs: number;
  feedItems: FeedItem[];
  popups: Popup[];
  lastResult: RoundResult | null;
  start: () => void;
  returnToMenu: () => void;
  handlePointerMove: (position: Position) => void;
  handleItemActivate: (id: string) => void;
}

export function useDuckFeedGame(
  options: UseDuckFeedGameOptions,
): UseDuckFeedGameResult {
  const { boardSize, difficulty, durationSeconds, recordScore } = options;
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Latest-value refs so the interval and pointer-move handler below never
  // close over stale state or props.
  const stateRef = useRef(state);
  stateRef.current = state;
  const boardSizeRef = useRef(boardSize);
  boardSizeRef.current = boardSize;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const durationMsRef = useRef(durationSeconds * 1000);
  durationMsRef.current = durationSeconds * 1000;
  const recordScoreRef = useRef(recordScore);
  recordScoreRef.current = recordScore;

  const lastFleeAtRef = useRef(0);
  const nextBonusPickupAtRef = useRef(0);

  const handleRoundComplete = useCallback(() => {
    const isNewHighScore = recordScoreRef.current(stateRef.current.score);
    dispatch({ type: 'end-round', isNewHighScore });
  }, []);

  const countdown = useCountdown(handleRoundComplete);
  const countdownRef = useRef(countdown);
  countdownRef.current = countdown;

  const start = useCallback(() => {
    const now = Date.now();
    const feed: FeedItem = {
      id: crypto.randomUUID(),
      kind: 'normal',
      position: randomPosition(boardSizeRef.current),
      lastMovedAt: now,
    };
    lastFleeAtRef.current = 0;
    nextBonusPickupAtRef.current =
      now + randomDelayMs(BONUS_PICKUP_MIN_DELAY_MS, BONUS_PICKUP_MAX_DELAY_MS);
    dispatch({ type: 'start', feed });
    countdownRef.current.start(durationMsRef.current);
  }, []);

  const returnToMenu = useCallback(() => {
    dispatch({ type: 'return-to-idle' });
  }, []);

  const evaluateProximity = useCallback((pointer: Position) => {
    const current = stateRef.current;
    const now = Date.now();

    if (current.status === 'playing' && current.feed) {
      const settings = DIFFICULTY_SETTINGS[difficultyRef.current];
      const elapsedMs = Math.max(
        durationMsRef.current - countdownRef.current.remainingMs,
        0,
      );
      const radius = escalatedFleeRadius(
        settings,
        elapsedMs,
        durationMsRef.current,
      );
      const canFlee =
        now - current.feed.lastMovedAt >= settings.retriggerCooldownMs;

      if (
        canFlee &&
        distance(pointer, itemCenter(current.feed.position)) <= radius
      ) {
        const withinComboWindow =
          lastFleeAtRef.current > 0 &&
          now - lastFleeAtRef.current <= settings.comboWindowMs;
        const comboCount = withinComboWindow ? current.comboCount + 1 : 1;
        const position = randomPositionAwayFrom(
          boardSizeRef.current,
          pointer,
          radius,
        );
        lastFleeAtRef.current = now;
        dispatch({
          type: 'relocate-feed',
          position,
          now,
          points: comboAward(comboCount),
          comboCount,
        });
        dispatch({
          type: 'add-popup',
          popup: {
            id: crypto.randomUUID(),
            kind: 'catch',
            position: pointer,
            createdAt: now,
          },
        });
        return;
      }

      if (
        current.bonusPickup &&
        distance(pointer, itemCenter(current.bonusPickup.position)) <=
          BONUS_PICKUP_RADIUS_PX
      ) {
        const crumbs = Array.from({ length: FLURRY_CRUMB_COUNT }, () =>
          spawnCrumb(boardSizeRef.current, pointer, now),
        );
        countdownRef.current.pause();
        dispatch({
          type: 'collect-bonus-pickup',
          crumbs,
          bonusPhaseEndsAt: now + BONUS_PHASE_DURATION_MS,
        });
      }
      return;
    }

    if (current.status === 'bonus-phase' && current.crumbs.length > 0) {
      const caught = current.crumbs.filter(
        (crumb) =>
          distance(pointer, itemCenter(crumb.position)) <=
          CRUMB_PICKUP_RADIUS_PX,
      );
      if (caught.length === 0) return;

      const replacements = caught.map(() =>
        spawnCrumb(boardSizeRef.current, pointer, now),
      );
      countdownRef.current.addTime(CRUMB_TIME_BONUS_MS * caught.length);
      dispatch({
        type: 'collect-crumbs',
        caughtIds: caught.map((crumb) => crumb.id),
        replacements,
      });
      for (const crumb of caught) {
        dispatch({
          type: 'add-popup',
          popup: {
            id: crypto.randomUUID(),
            kind: 'time-bonus',
            position: itemCenter(crumb.position),
            createdAt: now,
          },
        });
      }
    }
  }, []);

  const handleItemActivate = useCallback(
    (id: string) => {
      const current = stateRef.current;
      const candidates = [current.feed, current.bonusPickup, ...current.crumbs];
      const item = candidates.find((candidate) => candidate?.id === id);
      if (item) evaluateProximity(itemCenter(item.position));
    },
    [evaluateProximity],
  );

  // Everything time-based (combo expiry, bonus-pickup spawning, bonus-phase
  // expiry, popup cleanup) runs off this clock instead of pointer events, so
  // it stays correct even if the cursor never moves.
  useEffect(() => {
    if (state.status === 'idle' || state.status === 'game-over') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const current = stateRef.current;

      if (
        current.popups.some(
          (popup) => now - popup.createdAt >= POPUP_LIFETIME_MS,
        )
      ) {
        dispatch({ type: 'prune-popups', now });
      }

      if (current.status === 'playing') {
        const settings = DIFFICULTY_SETTINGS[difficultyRef.current];
        if (
          current.comboCount > 0 &&
          now - lastFleeAtRef.current > settings.comboWindowMs
        ) {
          dispatch({ type: 'reset-combo' });
        }
        if (!current.bonusPickup && now >= nextBonusPickupAtRef.current) {
          const avoid = current.feed
            ? itemCenter(current.feed.position)
            : { x: 0, y: 0 };
          const item: FeedItem = {
            id: crypto.randomUUID(),
            kind: 'bonus-pickup',
            position: randomPositionAwayFrom(
              boardSizeRef.current,
              avoid,
              FEED_ITEM_SIZE_PX,
            ),
            lastMovedAt: now,
          };
          dispatch({ type: 'spawn-bonus-pickup', item });
        }
        return;
      }

      if (
        current.status === 'bonus-phase' &&
        current.bonusPhaseEndsAt !== null &&
        now >= current.bonusPhaseEndsAt
      ) {
        countdownRef.current.resume();
        nextBonusPickupAtRef.current =
          now +
          randomDelayMs(BONUS_PICKUP_MIN_DELAY_MS, BONUS_PICKUP_MAX_DELAY_MS);
        // Treat the moment play resumes as a fresh flee for combo-timing
        // purposes, so the enforced pause doesn't cost the player their streak.
        lastFleeAtRef.current = now;
        dispatch({ type: 'end-bonus-phase' });
      }
    }, GAME_TICK_MS);

    return () => clearInterval(interval);
  }, [state.status]);

  const feedItems = useMemo(() => {
    const items: FeedItem[] = [];
    if (state.feed) items.push(state.feed);
    if (state.bonusPickup) items.push(state.bonusPickup);
    items.push(...state.crumbs);
    return items;
  }, [state.feed, state.bonusPickup, state.crumbs]);

  return {
    status: state.status,
    score: state.score,
    comboCount: state.comboCount,
    remainingMs: countdown.remainingMs,
    durationMs: durationMsRef.current,
    bonusPhaseEndsAt: state.bonusPhaseEndsAt,
    bonusPhaseDurationMs: BONUS_PHASE_DURATION_MS,
    feedItems,
    popups: state.popups,
    lastResult: state.lastResult,
    start,
    returnToMenu,
    handlePointerMove: evaluateProximity,
    handleItemActivate,
  };
}
