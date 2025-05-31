import { NextResponse } from "next/server";
import { prisma } from "~/server/db";
import { pusher } from "~/server/pusher";
import { CHANNELS, EVENTS } from "~/lib/constants";

export async function POST(req: Request) {
  try {
    const { roomId, playerId } = await req.json();

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 },
      );
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 },
      );
    }

    await prisma.player.delete({
      where: { id: playerId },
    });

    await pusher.trigger(CHANNELS.ROOM(roomId), EVENTS.PLAYER_LEFT, {
      playerId,
    });

    // If no players left, delete the room
    if (room.players.length <= 1) {
      await prisma.room.delete({
        where: { id: roomId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error leaving room:", error);
    return NextResponse.json(
      { error: "Failed to leave room" },
      { status: 500 },
    );
  }
} 