import fs from "fs/promises";
import { TODO_FILE } from "./path-policy";

export type TodoNode = {
    type: "item" | "heading";
    id: number; // line index
    text: string;
    checked?: boolean;
    indent?: string;
    level?: number;
};

export type TodoState = {
    raw: string;
    parsed: TodoNode[];
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
    const parsed: TodoNode[] = lines.map((line, index) => {
        // Match todo items: - [ ] text or - [x] text
        const todoMatch = line.match(/^(\s*)-\s+\[([ xX])\]\s+(.+)$/);
        if (todoMatch) {
            return {
                type: "item",
                id: index,
                indent: todoMatch[1],
                checked: todoMatch[2].toLowerCase() === "x",
                text: todoMatch[3],
            };
        }

        // Match headings: ## Section or ### Sub-section
        const headingMatch = line.match(/^(#{2,3})\s+(.+)$/);
        if (headingMatch) {
            return {
                type: "heading",
                id: index,
                text: headingMatch[2],
                level: headingMatch[1].length,
                indent: "",      // Defensive: prevent crash in older frontend shells
                checked: false   // Defensive: prevent crash in older frontend shells
            };
        }

        return null;
    }).filter(Boolean) as TodoNode[];

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
