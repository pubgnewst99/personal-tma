import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { BACAAN_DIR, IDEA_DIR, validatePath } from "./path-policy";

export type ContentMetadata = {
    id: string;
    source: "bacaan" | "idea";
    path: string;
    title: string;
    date?: string;
    tags: string[];
    summary?: string;
    updatedAt: number;
    folder?: string;
    readingTime?: number;
};

export type ContentItem = {
    metadata: ContentMetadata;
    content: string;
};

// Simple in-memory cache
let metadataCache: { [key: string]: { data: ContentMetadata[], timestamp: number } } = {};
const CACHE_TTL = 30000; // 30 seconds

/**
 * Scans a directory recursively and returns metadata for all .md files.
 */
export async function listContent(source: "bacaan" | "idea"): Promise<ContentMetadata[]> {
    const now = Date.now();
    if (metadataCache[source] && now - metadataCache[source].timestamp < CACHE_TTL) {
        return metadataCache[source].data;
    }

    const rootDir = source === "bacaan" ? BACAAN_DIR : IDEA_DIR;
    const allFiles = await getFilesRecursive(rootDir);
    const mdFiles = allFiles.filter(file => file.endsWith(".md"));

    // Process in smaller batches to avoid memory/CPU spikes
    const BATCH_SIZE = 10;
    const results: (ContentMetadata | null)[] = [];

    for (let i = 0; i < mdFiles.length; i += BATCH_SIZE) {
        const batch = mdFiles.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(async file => {
                try {
                    const stats = await fs.stat(file);
                    const rawContent = await fs.readFile(file, "utf-8");
                    const { data, content } = matter(rawContent);

                    const relativePath = path.relative(rootDir, file);
                    const folder = path.dirname(relativePath) === "." ? undefined : path.dirname(relativePath);

                    // Fallback title: frontmatter -> first H1 -> filename
                    let title = data.title;
                    if (!title) {
                        const h1Match = content.match(/^#\s+(.+)$/m);
                        title = h1Match ? h1Match[1].trim() : path.basename(file, ".md");
                    }

                    // Fallback date: frontmatter -> Content body "Date Saved: ..." -> mtime
                    let dateStr = data.date;
                    if (!dateStr) {
                        const dateMatch = content.match(/Date Saved:\s*(\d{4}-\d{2}-\d{2})/i);
                        dateStr = dateMatch ? dateMatch[1] : stats.mtime.toISOString();
                    }

                    // Fallback summary: frontmatter -> first paragraph
                    let summary = data.summary;
                    if (!summary) {
                        summary = content.trim().split("\n").find(line => line.trim() && !line.startsWith("#"))?.slice(0, 150);
                    }

                    return {
                        id: Buffer.from(file).toString("base64url"),
                        source,
                        path: relativePath,
                        title,
                        date: dateStr,
                        tags: data.tags || data.labels || [],
                        summary,
                        updatedAt: stats.mtimeMs,
                        folder,
                        readingTime: Math.max(1, Math.ceil(content.split(/\s+/).length / 200))
                    };
                } catch (err) {
                    console.error(`Error parsing ${file}:`, err);
                    return null;
                }
            })
        );
        results.push(...batchResults);
    }

    const finalData = (results.filter(Boolean) as ContentMetadata[]).sort((a, b) => b.updatedAt - a.updatedAt);
    metadataCache[source] = { data: finalData, timestamp: now };
    return finalData;
}

async function getFilesRecursive(dir: string): Promise<string[]> {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFilesRecursive(res) : res;
    }));
    return Array.prototype.concat(...files);
}

export async function getContentById(id: string): Promise<ContentItem | null> {
    try {
        const absolutePath = Buffer.from(id, "base64url").toString("utf-8");
        validatePath(absolutePath);

        const rawContent = await fs.readFile(absolutePath, "utf-8");
        const { data, content } = matter(rawContent);
        const stats = await fs.stat(absolutePath);

        // We don't know the source root here easily without checking both, 
        // but for the viewer we mostly need metadata + content.
        const metadata: ContentMetadata = {
            id,
            source: absolutePath.startsWith(BACAAN_DIR) ? "bacaan" : "idea",
            path: absolutePath,
            title: data.title || content.match(/^#\s+(.+)$/m)?.[1].trim() || path.basename(absolutePath, ".md"),
            date: data.date || content.match(/Date Saved:\s*(\d{4}-\d{2}-\d{2})/i)?.[1] || stats.mtime.toISOString(),
            tags: data.tags || data.labels || [],
            updatedAt: stats.mtimeMs,
            readingTime: Math.max(1, Math.ceil(content.split(/\s+/).length / 200))
        };

        return { metadata, content };
    } catch {
        return null;
    }
}
