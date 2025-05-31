import { NextResponse } from "next/server";
import { prisma } from "~/server/db";
import { pusher } from "~/server/pusher";
import { CHANNELS, EVENTS } from "~/lib/constants";

interface Player {
  id: string;
  name: string;
  progress: number;
  wpm: number;
  accuracy: number;
  completed: boolean;
  roomId: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(req: Request) {
  try {
    const { roomId, playerId, playerName } = await req.json();

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

    if (room.status === "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Game already in progress" },
        { status: 400 },
      );
    }

    // Check if player already exists in the room
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (existingPlayer && existingPlayer.roomId === roomId) {
      return NextResponse.json({
        room,
        players: room.players,
      });
    }

    const player = await prisma.player.create({
      data: {
        name: playerName || `Player ${playerId}`,
        roomId,
      },
    });

    await pusher.trigger(CHANNELS.ROOM(roomId), EVENTS.PLAYER_JOINED, {
      player,
    });
    console.log(room,"room");
    return NextResponse.json({
      ...room,
      roomId: room.id,
      players: [...room.players, player],
    });
  } catch (error) {
    console.error("Error joining room:", error);
    return NextResponse.json(
      { error: "Failed to join room" },
      { status: 500 },
    );
  }
} 