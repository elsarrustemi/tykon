import { pusher } from "~/server/pusher";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const data = await req.json();
  const { socket_id, channel_name } = data;

  try {
    const authResponse = pusher.authorizeChannel(socket_id, channel_name);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
} 