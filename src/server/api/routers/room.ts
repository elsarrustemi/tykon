import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure } from "../trpc";

// Add new input schema for rematch requests
const rematchRequestSchema = z.object({
  roomId: z.string(),
  userId: z.string(),
});

// Add new rematch procedure
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
    // Check if the user is a player in the room
    const player = room.players.find((p) => p.userId === userId);
    if (!player) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User is not a player in this room",
      });
    }
    // Update the player's rematch flag
    await ctx.db.player.update({
      where: { id: player.id },
      data: { rematchRequested: true },
    });
    // Check if both players have requested a rematch
    const allPlayersRequestedRematch = room.players.every((p) => p.rematchRequested);
    if (allPlayersRequestedRematch) {
      // Create a new room for the rematch
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
      // Notify players about the new room (e.g., via Pusher)
      // For now, we'll just return the new room ID
      return { newRoomId: newRoom.id };
    }
    return { newRoomId: null };
  }),

// Update the complete procedure to not delete the room after completion
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
    // Update room status to completed
    await ctx.db.room.update({
      where: { id: roomId },
      data: { status: "COMPLETED" },
    });
    // Do not delete the room
    return { success: true };
  }), 