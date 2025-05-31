import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { pusher } from "~/server/pusher";
import { CHANNELS, EVENTS } from "~/lib/constants";
import { generateText } from "~/utils/textGenerator";
import { fetchQuote } from "~/utils/quoteFetcher";
import { TRPCError } from "@trpc/server";

export const roomsRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({
      roomId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.prisma.room.findUnique({
        where: { id: input.roomId },
        include: { 
          players: true,
          performances: {
            include: {
              player: true
            }
          }
        },
      });

      if (!room) {
        throw new Error("Room not found");
      }

      return { room };
    }),

  create: protectedProcedure
    .input(z.object({
      playerId: z.string(),
      playerName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { playerId, playerName } = input;
      const { content: quote } = await fetchQuote();

      // First create or get the player
      const player = await ctx.prisma.player.upsert({
        where: { id: playerId },
        create: {
          id: playerId,
          name: playerName,
          progress: 0,
          wpm: 0,
          accuracy: 100,
          completed: false,
        },
        update: {
          name: playerName,
        },
      });

      // Then create the room with the quote
      const room = await ctx.prisma.room.create({
        data: {
          text: quote,
          status: "WAITING",
          createdBy: playerId,
          players: {
            connect: { id: playerId }
          },
        },
        include: {
          players: true,
        },
      });

      // Update player's roomId
      await ctx.prisma.player.update({
        where: { id: playerId },
        data: { roomId: room.id }
      });

      await pusher.trigger(
        CHANNELS.ROOM(room.id),
        EVENTS.PLAYER_JOINED,
        {
          player: room.players[0],
        }
      );

      return { roomId: room.id, text: quote, room };
    }),

  join: protectedProcedure
    .input(z.object({
      roomId: z.string(),
      playerId: z.string(),
      playerName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { roomId, playerId, playerName } = input;

      const room = await ctx.prisma.room.findUnique({
        where: { id: roomId },
        include: { players: true, performances: true },
      });

      if (!room) {
        throw new Error("Room not found");
      }

      // Check if room is full (2 players)
      if (room.players.length >= 2) {
        throw new Error("Room is full");
      }

      // Check if player already exists in the room
      const existingPlayer = room.players.find((p: { id: string }) => p.id === playerId);
      if (existingPlayer) {
        return { room, players: room.players };
      }

      // Create or update player
      const player = await ctx.prisma.player.upsert({
        where: { id: playerId },
        create: {
          id: playerId,
          name: playerName,
          progress: 0,
          wpm: 0,
          accuracy: 100,
          completed: false,
          roomId: roomId
        },
        update: {
          name: playerName,
          roomId: roomId
        },
      });

      const updatedRoom = await ctx.prisma.room.update({
        where: { id: roomId },
        data: {
          players: {
            connect: { id: playerId }
          },
        },
        include: {
          players: true,
        },
      });

      await pusher.trigger(
        CHANNELS.ROOM(roomId),
        EVENTS.PLAYER_JOINED,
        {
          player: updatedRoom.players[updatedRoom.players.length - 1],
        }
      );

      return { room: updatedRoom, players: updatedRoom.players };
    }),

  updateProgress: protectedProcedure
    .input(z.object({
      roomId: z.string(),
      playerId: z.string(),
      progress: z.number(),
      wpm: z.number(),
      accuracy: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { roomId, playerId, progress, wpm, accuracy } = input;

      // Update player progress in the database
      const player = await ctx.prisma.player.update({
        where: { 
          id: playerId,
          roomId: roomId // Ensure player belongs to the room
        },
        data: {
          progress,
          wpm,
          accuracy,
        },
      });

      // Create or update performance record
      const performance = await ctx.prisma.performance.upsert({
        where: {
          playerId_roomId: {
            playerId,
            roomId,
          },
        },
        create: {
          playerId,
          roomId,
          wpm,
          accuracy,
          completed: false,
        },
        update: {
          wpm,
          accuracy,
        },
      });

      // Send performance update through Pusher
      await pusher.trigger(
        CHANNELS.ROOM(roomId),
        EVENTS.TYPING_UPDATE,
        {
          playerId,
          progress,
          wpm,
          accuracy,
          performance,
        }
      );

      return { player, performance };
    }),

  completeGame: protectedProcedure
    .input(z.object({
      roomId: z.string(),
      playerId: z.string(),
      wpm: z.number(),
      accuracy: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { roomId, playerId, wpm, accuracy } = input;

      // Update player status
      await ctx.prisma.player.update({
        where: { id: playerId },
        data: {
          completed: true,
          wpm,
          accuracy,
        },
      });

      // Create performance record
      await ctx.prisma.performance.upsert({
        where: {
          playerId_roomId: {
            playerId,
            roomId,
          },
        },
        create: {
          playerId,
          roomId,
          wpm,
          accuracy,
          completed: true,
        },
        update: {
          wpm,
          accuracy,
          completed: true,
        },
      });

      await pusher.trigger(
        CHANNELS.ROOM(roomId),
        EVENTS.GAME_COMPLETE,
        {
          playerId,
          wpm,
          accuracy,
        }
      );

      return { success: true };
    }),

  start: protectedProcedure
    .input(z.object({
      roomId: z.string(),
      playerId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.prisma.room.findUnique({
        where: { id: input.roomId },
        include: { 
          players: true,
          performances: {
            include: {
              player: true
            }
          }
        },
      });

      if (!room) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Room not found",
        });
      }

      if (room.createdBy !== input.playerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the room creator can start the game",
        });
      }

      if (room.players.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Need at least 2 players to start the game",
        });
      }

      // First trigger countdown event
      await pusher.trigger(CHANNELS.ROOM(input.roomId), EVENTS.COUNTDOWN_START, {
        roomId: input.roomId,
      });

      // Wait for 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Update room status
      const updatedRoom = await ctx.prisma.room.update({
        where: { id: input.roomId },
        data: { status: "IN_PROGRESS" },
        include: { 
          players: true,
          performances: {
            include: {
              player: true
            }
          }
        },
      });

      // Reset all players' stats
      await ctx.prisma.player.updateMany({
        where: { roomId: input.roomId },
        data: {
          progress: 0,
          wpm: 0,
          accuracy: 100,
          completed: false,
        },
      });

      // Clear all performances for this room
      await ctx.prisma.performance.deleteMany({
        where: { roomId: input.roomId },
      });

      // Trigger game start event for all players
      await pusher.trigger(CHANNELS.ROOM(input.roomId), EVENTS.GAME_START, {
        roomId: input.roomId,
        status: "IN_PROGRESS",
        players: updatedRoom.players,
        performances: updatedRoom.performances,
      });

      return updatedRoom;
    }),

  leave: protectedProcedure
    .input(z.object({
      roomId: z.string(),
      playerId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { roomId, playerId } = input;

      const room = await ctx.prisma.room.findUnique({
        where: { id: roomId },
        include: { 
          players: true,
          performances: {
            include: {
              player: true
            }
          }
        },
      });

      if (!room) {
        throw new Error("Room not found");
      }

      // Get the leaving player's stats before disconnecting
      const leavingPlayer = room.players.find((p: { id: string }) => p.id === playerId);
      if (leavingPlayer) {
        // Create a performance record for the leaving player
        await ctx.prisma.performance.upsert({
          where: {
            playerId_roomId: {
              playerId,
              roomId,
            },
          },
          create: {
            playerId,
            roomId,
            wpm: leavingPlayer.wpm,
            accuracy: leavingPlayer.accuracy,
            completed: false,
          },
          update: {
            wpm: leavingPlayer.wpm,
            accuracy: leavingPlayer.accuracy,
            completed: false,
          },
        });
      }

      // If the leaving player is the owner, remove all players
      if (room.createdBy === playerId) {
        // Delete all performances for this room
        await ctx.prisma.performance.deleteMany({
          where: { roomId },
        });

        // Update all players to remove room reference
        await ctx.prisma.player.updateMany({
          where: { roomId },
          data: { roomId: null },
        });

        // Update room status to COMPLETED
        await ctx.prisma.room.update({
          where: { id: roomId },
          data: { status: "COMPLETED" },
        });

        // Notify all players that the room is closed and they should redirect
        await pusher.trigger(
          CHANNELS.ROOM(roomId),
          EVENTS.PLAYER_LEFT,
          {
            playerId,
            roomStatus: "COMPLETED",
            isAdmin: true,
            message: "Room owner left. Room closed.",
            shouldRedirect: true
          }
        );
      } else {
        // If not the owner, just remove this player
        await ctx.prisma.performance.deleteMany({
          where: {
            playerId: playerId,
            roomId: roomId,
          },
        });

        // Update player to remove room reference
        await ctx.prisma.player.update({
          where: { id: playerId },
          data: { roomId: null },
        });

        // Update room status to COMPLETED if game was in progress
        if (room.status === "IN_PROGRESS") {
          await ctx.prisma.room.update({
            where: { id: roomId },
            data: { status: "COMPLETED" },
          });
        }

        await pusher.trigger(
          CHANNELS.ROOM(roomId),
          EVENTS.PLAYER_LEFT,
          {
            playerId,
            roomStatus: "COMPLETED",
            isAdmin: false,
            message: "Player left the room",
            shouldRedirect: false
          }
        );
      }

      return { success: true };
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    // For demo: get playerId from header (in real app, use session)
    const playerId = ctx.req.headers["x-player-id"] as string | undefined;

    // Online players: players with a non-null roomId
    const onlinePlayers = await ctx.prisma.player.count({
      where: { roomId: { not: null } },
    });

    // Active races: rooms with status 'IN_PROGRESS'
    const activeRaces = await ctx.prisma.room.count({
      where: { status: "IN_PROGRESS" },
    });

    let bestWpm = null;
    let recentAverage = null;
    if (playerId) {
      // Best WPM from performances
      const best = await ctx.prisma.performance.findFirst({
        where: { 
          playerId,
          completed: true 
        },
        orderBy: { wpm: "desc" },
      });
      bestWpm = best?.wpm ?? null;

      // Recent average (last 5 completed performances)
      const recent = await ctx.prisma.performance.findMany({
        where: { 
          playerId,
          completed: true 
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      if (recent.length > 0) {
        recentAverage =
          recent.reduce((sum, p) => sum + p.wpm, 0) / recent.length;
      }
    }

    return {
      onlinePlayers,
      activeRaces,
      bestWpm,
      recentAverage,
    };
  }),

  newGame: protectedProcedure
    .input(z.object({
      roomId: z.string(),
      playerId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { roomId, playerId } = input;

      const room = await ctx.prisma.room.findUnique({
        where: { id: roomId },
        include: { players: true },
      });

      if (!room) {
        throw new Error("Room not found");
      }

      // Fetch a new quote
      const { content: quote } = await fetchQuote();

      // Create a new room with the new quote
      const newRoom = await ctx.prisma.room.create({
        data: {
          text: quote,
          status: "WAITING",
          createdBy: room.createdBy,
          players: {
            connect: room.players.map((p) => ({ id: p.id })),
          },
        },
        include: { players: true },
      });

      await pusher.trigger(
        CHANNELS.ROOM(roomId),
        EVENTS.NEW_GAME_CREATED,
        {
          newRoomId: newRoom.id,
        }
      );

      return { newRoomId: newRoom.id };
    }),
}); 