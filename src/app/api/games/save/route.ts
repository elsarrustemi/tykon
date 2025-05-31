import { NextResponse } from "next/server";
import { prisma } from "~/server/db";

export async function POST(req: Request) {
  try {
    const { roomId, wpm, accuracy, timeTaken, text } = await req.json();

    const gameResult = await prisma.gameResult.create({
      data: {
        roomId,
        wpm,
        accuracy,
        timeTaken,
        text,
      },
    });

    return NextResponse.json(gameResult);
  } catch (error) {
    console.error("Error saving game result:", error);
    return NextResponse.json({ error: "Failed to save game result" }, { status: 500 });
  }
} 