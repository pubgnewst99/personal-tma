import { NextRequest, NextResponse } from "next/server";
import { listContent } from "@/lib/indexer";

export const runtime = "nodejs";
const REMOTE_API_BASE = process.env.FEED_SOURCE_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";

function buildRemoteUrl(routePath: string): string {
  const base = REMOTE_API_BASE.replace(/\/+$/, "");
  if (base.endsWith("/api") && routePath.startsWith("/api/")) {
    return `${base}${routePath.slice(4)}`;
  }
  return `${base}${routePath}`;
}

function canProxyToRemote(requestUrl: string): boolean {
  if (!REMOTE_API_BASE) return false;
  try {
    const requestOrigin = new URL(requestUrl).origin;
    const remoteOrigin = new URL(REMOTE_API_BASE, requestUrl).origin;
    return requestOrigin !== remoteOrigin;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") as "bacaan" | "idea";

  if (!source || !["bacaan", "idea"].includes(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  try {
    const items = await listContent(source);
    return NextResponse.json(items);
  } catch (error: unknown) {
    if (canProxyToRemote(request.url)) {
      try {
        const upstream = await fetch(buildRemoteUrl(`/api/content?source=${source}`));
        if (upstream.ok) {
          const body = await upstream.text();
          return new NextResponse(body, {
            status: upstream.status,
            headers: {
              "Content-Type": upstream.headers.get("content-type") || "application/json",
            },
          });
        }
      } catch {
        // fall through to local error response
      }
    }

    // Degrade gracefully for list pages: empty collection keeps UI functional.
    const message = error instanceof Error ? error.message : "Failed to load content";
    return NextResponse.json([], {
      status: 200,
      headers: { "X-Content-Warning": message },
    });
  }
}
