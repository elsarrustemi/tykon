import { NextResponse } from "next/server";
import { pusher } from "~/server/pusher";
import { prisma } from "~/server/db";
import { generateText } from "~/utils/textGenerator";
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
    const { difficulty, playerId, playerName } = await req.json();
    const text = generateText(difficulty);
    const roomId = Math.random().toString(36).substring(7);

    const room = await prisma.room.create({
      data: {
        id: roomId,
        name: `Room ${roomId}`,
        text,
        status: "WAITING",
      },
      include: { players: true },
    });

    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId },
    });

    let player;
    if (existingPlayer) {
      player = await prisma.player.update({
        where: { id: playerId },
        data: { roomId },
      });
    } else {
      player = await prisma.player.create({
        data: {
          id: playerId,
          name: playerName || `Player ${playerId}`,
          roomId,
        },
      });
    }

    await pusher.trigger(CHANNELS.ROOM(roomId), EVENTS.GAME_START, {
      room: { ...room, players: [player] },
    });

    return NextResponse.json({ 
      roomId: room.id, 
      text: room.text,
      player,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 },
    );
  }
} 