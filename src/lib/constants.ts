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
  NEW_GAME_CREATED: 'new-game-created',
  COUNTDOWN_START: 'countdown-start',
} as const; 