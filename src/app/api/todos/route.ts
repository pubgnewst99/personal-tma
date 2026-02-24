import { NextResponse } from "next/server";
import { getTodoState } from "@/lib/todo-service";

export async function GET() {
  try {
    const state = await getTodoState();
    return NextResponse.json(state);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
