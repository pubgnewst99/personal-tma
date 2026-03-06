import { NextRequest, NextResponse } from "next/server";
import { validatePath } from "@/lib/path-policy";
import fs from "fs/promises";
import path from "path";
import { BACAAN_DIR, IDEA_DIR } from "@/lib/path-policy";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");
  const source = searchParams.get("source") as "bacaan" | "idea";

  if (!filePath || !source) {
    return NextResponse.json({ error: "Missing path or source" }, { status: 400 });
  }

  const REMOTE_API_BASE = process.env.FEED_SOURCE_API_BASE_URL;
  if (REMOTE_API_BASE) {
    try {
      const remoteUrl = new URL(`/api/assets?path=${encodeURIComponent(filePath)}&source=${encodeURIComponent(source)}`, REMOTE_API_BASE);
      const response = await fetch(remoteUrl.toString());
      if (!response.ok) {
        return NextResponse.json({ error: "Asset proxy failed: " + response.statusText }, { status: response.status });
      }
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
          "Cache-Control": "public, max-age=31536000, immutable",
        }
      });
    } catch (err: any) {
      console.error("Asset proxy error:", err);
      return NextResponse.json({ error: "Asset proxy error" }, { status: 500 });
    }
  }

  try {
    const rootDir = source === "bacaan" ? BACAAN_DIR : IDEA_DIR;
    const absolutePath = validatePath(path.join(rootDir, filePath));

    const stats = await fs.stat(absolutePath);
    if (!stats.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 404 });
    }

    // If file is very large (> 10MB), we might want to stream it
    // But for now, most TMA assets are small.
    const fileBuffer = await fs.readFile(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();

    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".svg") contentType = "image/svg+xml";
    else if (ext === ".webp") contentType = "image/webp";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("Asset serving error:", error);
    return NextResponse.json({ error: "Asset not found or access denied" }, { status: 404 });
  }
}
