import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure } from "../trpc";

const rematchRequestSchema = z.object({
  roomId: z.string(),
  userId: z.string(),
});

rematch: publicProcedure
  .input(rematchRequestSchema)
  .mutation(async ({ ctx, input }) => {
    const { roomId, userId } = input;
    const room = await ctx.db.room.findUnique({
      where: { id: roomId },
      include: { players: true },
    });
    if (!room) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Room not found",
      });
    }
    const player = room.players.find((p) => p.userId === userId);
    if (!player) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User is not a player in this room",
      });
    }
    await ctx.db.player.update({
      where: { id: player.id },
      data: { rematchRequested: true },
    });
    const allPlayersRequestedRematch = room.players.every((p) => p.rematchRequested);
    if (allPlayersRequestedRematch) {
      const newRoom = await ctx.db.room.create({
        data: {
          status: "WAITING",
          players: {
            create: room.players.map((p) => ({
              userId: p.userId,
              status: "WAITING",
              rematchRequested: false,
            })),
          },
        },
        include: { players: true },
      });
      return { newRoomId: newRoom.id };
    }
    return { newRoomId: null };
  }),

complete: publicProcedure
  .input(z.object({ roomId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const { roomId } = input;
    const room = await ctx.db.room.findUnique({
      where: { id: roomId },
      include: { players: true },
    });
    if (!room) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Room not found",
      });
    }
    await ctx.db.room.update({
      where: { id: roomId },
      data: { status: "COMPLETED" },
    });
    return { success: true };
  }), 