import Pusher from 'pusher';
import { env } from "~/env";

export const pusher = new Pusher({
  appId: env.PUSHER_APP_ID,
  key: env.PUSHER_KEY,
  secret: env.PUSHER_SECRET,
  host: env.PUSHER_HOST,
  port: env.PUSHER_PORT || '6001',
  useTLS: env.NODE_ENV === 'production',
  cluster: 'mt1',
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