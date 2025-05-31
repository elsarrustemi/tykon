import { Server } from 'soketi';
import { env } from "~/env";

export const soketi = new Server({
  appId: env.SOKETI_APP_ID,
  key: env.SOKETI_KEY,
  secret: env.SOKETI_SECRET,
  host: env.SOKETI_HOST,
  port: parseInt(env.SOKETI_PORT || '6001', 10),
  useTLS: env.NODE_ENV === 'production',
});

export const CHANNELS = {
  ROOM: (roomId: string) => `room-${roomId}`,
  PLAYER: (playerId: string) => `player-${playerId}`,
} as const;

export const EVENTS = {
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  GAME_START: 'game-start',
  TYPING_UPDATE: 'typing-update',
  GAME_COMPLETE: 'game-complete',
} as const; 