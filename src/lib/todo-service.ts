import fs from "fs/promises";
import { TODO_FILE } from "./path-policy";

export type TodoItem = {
    id: number; // line index
    text: string;
    checked: boolean;
    indent: string;
};

export type TodoState = {
    raw: string;
    parsed: TodoItem[];
    revision: string;
};

/**
 * Reads and parses the todo.md file.
 */
export async function getTodoState(): Promise<TodoState> {
    const stats = await fs.stat(TODO_FILE);
    const raw = await fs.readFile(TODO_FILE, "utf-8");
    const revision = stats.mtimeMs.toString();

    const lines = raw.split("\n");
    const parsed: TodoItem[] = lines.map((line, index) => {
        const match = line.match(/^(\s*)-\s+\[([ xX])\]\s+(.+)$/);
        if (match) {
            return {
                id: index,
                indent: match[1],
                checked: match[2].toLowerCase() === "x",
                text: match[3],
            };
        }
        return null;
    }).filter(Boolean) as TodoItem[];

    return { raw, parsed, revision };
}

/**
 * Toggles a single todo item by its line index.
 * Implements optimistic concurrency check using the revision.
 */
export async function toggleTodo(lineIndex: number, checked: boolean, revision: string): Promise<TodoState> {
    const currentState = await getTodoState();

    if (currentState.revision !== revision) {
        throw new Error("Conflict: File has been modified externally. Please refresh.");
    }

    const lines = currentState.raw.split("\n");
    const line = lines[lineIndex];

    // Replace the [ ] or [x] part
    const updatedLine = line.replace(/\[([ xX])\]/, `[${checked ? "x" : " "}]`);
    lines[lineIndex] = updatedLine;

    const finalRaw = lines.join("\n");
    await fs.writeFile(TODO_FILE, finalRaw, "utf-8");

    return getTodoState();
}

/**
 * Saves the entire todo file content.
 */
export async function saveRawTodo(raw: string, revision: string): Promise<TodoState> {
    const currentState = await getTodoState();

    if (currentState.revision !== revision) {
        throw new Error("Conflict: File has been modified externally. Please refresh.");
    }

    await fs.writeFile(TODO_FILE, raw, "utf-8");
    return getTodoState();
}
