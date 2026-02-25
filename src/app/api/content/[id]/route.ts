import { NextResponse } from "next/server";
import { getContentById } from "@/lib/indexer";

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getContentById(id);
    if (!item && canProxyToRemote(request.url)) {
      const upstream = await fetch(buildRemoteUrl(`/api/content/${id}`));
      const body = await upstream.text();
      return new NextResponse(body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") || "application/json",
        },
      });
    }
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (error: unknown) {
    if (canProxyToRemote(request.url)) {
      try {
        const { id } = await params;
        const upstream = await fetch(buildRemoteUrl(`/api/content/${id}`));
        const body = await upstream.text();
        return new NextResponse(body, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("content-type") || "application/json",
          },
        });
      } catch {
        // fall through to local error response
      }
    }

    const message = error instanceof Error ? error.message : "Failed to load content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
