import path from "path";
import os from "os";

const HOME = os.homedir();

// Canonical paths from env or defaults
export const BACAAN_DIR = path.resolve(process.env.TMA_BACAAN_DIR?.replace("~", HOME) || path.join(HOME, "Bacaan"));
export const IDEA_DIR = path.resolve(process.env.TMA_IDEA_DIR?.replace("~", HOME) || path.join(HOME, "Idea"));
export const TODO_FILE = path.resolve(process.env.TMA_TODO_FILE?.replace("~", HOME) || path.join(HOME, "todo.md"));

const ALLOWED_ROOTS = [BACAAN_DIR, IDEA_DIR, path.dirname(TODO_FILE)];

/**
 * Validates that a given path is within the allowed directories.
 * Prevents directory traversal attacks.
 */
export function validatePath(requestedPath: string): string {
    const absolutePath = path.resolve(requestedPath.replace("~", HOME));

    const isAllowed = ALLOWED_ROOTS.some(root => absolutePath.startsWith(root));

    if (!isAllowed) {
        throw new Error("Access denied: Path outside of allowlisted directories.");
    }

    return absolutePath;
}

export function getRelativePath(absolutePath: string, root: string): string {
    return path.relative(root, absolutePath);
}
