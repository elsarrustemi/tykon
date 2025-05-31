import { NextResponse } from "next/server";
import { pusher } from "~/server/pusher";
import { CHANNELS, EVENTS } from "~/lib/constants";

export async function POST(req: Request) {
  try {
    const { channel, event, data } = await req.json();

    await pusher.trigger(channel, event, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error triggering Pusher event:", error);
    return NextResponse.json(
      { error: "Failed to trigger event" },
      { status: 500 },
    );
  }
} 