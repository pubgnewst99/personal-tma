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
    if (typeof line !== "string") {
        throw new Error("Invalid todo line.");
    }

    // Replace the [ ] or [x] part
    const updatedLine = line.replace(/\[([ xX])\]/, `[${checked ? "x" : " "}]`);
    if (updatedLine === line && !/\-\s+\[[ xX]\]\s+/.test(line)) {
        throw new Error("Target line is not a todo item.");
    }
    lines[lineIndex] = updatedLine;

    const headingRegex = /^##\s+(.+)$/;

    const findFinishedHeadingStart = (): number => {
        for (let i = 0; i < lines.length; i += 1) {
            const match = lines[i].match(headingRegex);
            if (match && /finished/i.test(match[1])) return i;
        }
        return -1;
    };

    const getSectionStartForLine = (targetIndex: number): number => {
        for (let i = targetIndex; i >= 0; i -= 1) {
            if (headingRegex.test(lines[i])) return i;
        }
        return -1;
    };

    const findFinishedSectionEnd = (finishedStart: number): number => {
        for (let i = finishedStart + 1; i < lines.length; i += 1) {
            if (headingRegex.test(lines[i])) return i;
        }
        return lines.length;
    };

    const finishedStart = findFinishedHeadingStart();
    if (finishedStart >= 0) {
        const sectionStart = getSectionStartForLine(lineIndex);
        const isInFinishedSection = sectionStart === finishedStart;

        if (checked && !isInFinishedSection) {
            const [movedLine] = lines.splice(lineIndex, 1);
            let insertAt = findFinishedSectionEnd(finishedStart);
            if (lineIndex < insertAt) insertAt -= 1;
            while (insertAt > finishedStart + 1 && lines[insertAt - 1]?.trim() === "") {
                insertAt -= 1;
            }
            lines.splice(insertAt, 0, movedLine);
        } else if (!checked && isInFinishedSection) {
            const [movedLine] = lines.splice(lineIndex, 1);
            let insertAt = finishedStart;
            if (lineIndex < insertAt) insertAt -= 1;
            while (insertAt > 0 && lines[insertAt - 1]?.trim() === "") {
                insertAt -= 1;
            }
            lines.splice(insertAt, 0, movedLine);
        }
    }

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
