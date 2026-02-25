import { NextResponse } from "next/server";
import { toggleTodo } from "@/lib/todo-service";

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

export async function PATCH(request: Request) {
    let payload: { id?: number; checked?: boolean; revision?: string } | null = null;

    try {
        payload = await request.json() as { id?: number; checked?: boolean; revision?: string };
        const { id, checked, revision } = payload;

        if (typeof id !== "number" || typeof checked !== "boolean" || !revision) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const newState = await toggleTodo(id, checked, revision);
        return NextResponse.json(newState);
    } catch (error: unknown) {
        if (canProxyToRemote(request.url)) {
            try {
                const upstream = await fetch(buildRemoteUrl("/api/todos/toggle"), {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const body = await upstream.text();
                return new NextResponse(body, {
                    status: upstream.status,
                    headers: {
                        "Content-Type": upstream.headers.get("content-type") || "application/json",
                    },
                });
            } catch {
                // fall through
            }
        }

        const message = error instanceof Error ? error.message : "Failed to toggle todo";
        return NextResponse.json({ error: message }, { status: 409 });
    }
}
