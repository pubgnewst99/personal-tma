import { NextResponse } from "next/server";
import { getHomeFeed } from "@/lib/feed-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const feed = await getHomeFeed();
    return new Response(JSON.stringify(feed), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-telegram-init-data"
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load feed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
