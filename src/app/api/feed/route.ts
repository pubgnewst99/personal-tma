import { NextResponse } from "next/server";
import { getHomeFeed } from "@/lib/feed-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const feed = await getHomeFeed();
    return NextResponse.json(feed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load feed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
