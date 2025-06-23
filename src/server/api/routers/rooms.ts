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
      try {
        const { playerId, playerName } = input;
        const { content: quote } = await fetchQuote();

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
      } catch (error) {
        throw error;
      }
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

      if (room.players.length >= 2) {
        throw new Error("Room is full");
      }

      const existingPlayer = room.players.find((p: { id: string }) => p.id === playerId);
      if (existingPlayer) {
        return { room, players: room.players };
      }

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

      const player = await ctx.prisma.player.update({
        where: { 
          id: playerId,
          roomId: roomId
        },
        data: {
          progress,
          wpm,
          accuracy,
        },
      });

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

      await ctx.prisma.player.update({
        where: { id: playerId },
        data: {
          completed: true,
          wpm,
          accuracy,
        },
      });

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

      await pusher.trigger(CHANNELS.ROOM(input.roomId), EVENTS.COUNTDOWN_START, {
        roomId: input.roomId,
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

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

      await ctx.prisma.player.updateMany({
        where: { roomId: input.roomId },
        data: {
          progress: 0,
          wpm: 0,
          accuracy: 100,
          completed: false,
        },
      });

      await ctx.prisma.performance.deleteMany({
        where: { roomId: input.roomId },
      });

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

      const leavingPlayer = room.players.find((p: { id: string }) => p.id === playerId);
      if (leavingPlayer) {
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

      if (room.createdBy === playerId) {
        await ctx.prisma.performance.deleteMany({
          where: { roomId },
        });

        await ctx.prisma.player.updateMany({
          where: { roomId },
          data: { roomId: null },
        });

        await ctx.prisma.room.update({
          where: { id: roomId },
          data: { status: "COMPLETED" },
        });

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
        await ctx.prisma.performance.deleteMany({
          where: {
            playerId: playerId,
            roomId: roomId,
          },
        });

        await ctx.prisma.player.update({
          where: { id: playerId },
          data: { roomId: null },
        });

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
    const playerId = ctx.req.headers["x-player-id"] as string | undefined;

    const onlinePlayers = await ctx.prisma.player.count({
      where: { roomId: { not: null } },
    });

    const activeRaces = await ctx.prisma.room.count({
      where: { status: "IN_PROGRESS" },
    });

    let bestWpm = null;
    let recentAverage = null;
    if (playerId) {
      const best = await ctx.prisma.performance.findFirst({
        where: { 
          playerId,
          completed: true 
        },
        orderBy: { wpm: "desc" },
      });
      bestWpm = best?.wpm ?? null;

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

      const { content: quote } = await fetchQuote();

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