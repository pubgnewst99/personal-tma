import { NextResponse } from "next/server";
import { toggleTodo } from "@/lib/todo-service";

export async function PATCH(request: Request) {
    try {
        const { id, checked, revision } = await request.json();

        if (typeof id !== "number" || typeof checked !== "boolean" || !revision) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const newState = await toggleTodo(id, checked, revision);
        return NextResponse.json(newState);
    } catch (error: any) {
        console.error("Todo Toggle Error:", error);
        return NextResponse.json({ error: error.message }, { status: 409 });
    }
}
