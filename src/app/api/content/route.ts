import { NextResponse } from "next/server";
import { listContent } from "@/lib/indexer";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") as "bacaan" | "idea";

  if (!source || !["bacaan", "idea"].includes(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  try {
    const items = await listContent(source);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
