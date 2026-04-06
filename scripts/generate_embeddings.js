import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';

// Try to import pipeline; handle ESM module loading pattern for the script
let pipeline;
try {
  const transformers = await import('@xenova/transformers');
  pipeline = transformers.pipeline;
} catch (e) {
  console.error("Please run: npm install @xenova/transformers");
  process.exit(1);
}

const BACAAN_DIR = "/home/dwiki/Bacaan";
const IDEA_DIR = "/home/dwiki/Idea";
const DB_PATH = path.join(process.cwd(), "vector_index.json");

// Simple markdown stripper
function stripMarkdown(text) {
  return text
    .replace(/^#+\s+/gm, '') // Remove headers
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
    .replace(/[**__~~`]+/g, '') // Bold, italic, strikethrough, inline code
    .replace(/>\s+/g, '') // Blockquotes
    .replace(/\n\s*[-*+]\s+/g, '\n') // Lists
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
    .slice(0, 1500); // Only use the first 1500 chars for embedding to save time & context
}

async function getFilesRecursive(dir) {
  try {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFilesRecursive(res) : res;
    }));
    return Array.prototype.concat(...files);
  } catch (e) {
    return [];
  }
}

async function main() {
  console.log("Loading Xenova/all-MiniLM-L6-v2 model...");
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log("Model loaded.");

  // Load existing vectors if any
  let db = {};
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    db = JSON.parse(data);
  } catch (e) {
    console.log("No existing vector_index.json found, creating new.");
  }

  const allFiles = [
    ...(await getFilesRecursive(BACAAN_DIR)),
    ...(await getFilesRecursive(IDEA_DIR))
  ].filter(file => file.endsWith(".md"));

  console.log(`Found ${allFiles.length} markdown files. Scanning for changes...`);

  let updatedCount = 0;

  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    try {
      const stats = await fs.stat(file);
      const mtimeMs = stats.mtimeMs;
      
      const id = Buffer.from(file).toString("base64url");

      if (db[id] && db[id].updatedAt >= mtimeMs) {
        // Skip, already up to date
        continue;
      }

      const rawContent = await fs.readFile(file, "utf-8");
      const { content, data } = matter(rawContent);

      let title = data.title;
      if (!title) {
        const h1Match = content.match(/^#\s+(.+)$/m);
        title = h1Match ? h1Match[1].trim() : path.basename(file, ".md");
      }

      const cleanText = `${title}. ${stripMarkdown(content)}`;
      
      // Generate embedding
      const output = await extractor(cleanText, { pooling: 'mean', normalize: true });
      const vector = Array.from(output.data);

      db[id] = {
        title,
        updatedAt: mtimeMs,
        source: file.startsWith(BACAAN_DIR) ? "bacaan" : "idea",
        vector
      };

      updatedCount++;
      process.stdout.write(`\rProcessed ${i + 1}/${allFiles.length} (${updatedCount} updated)`);
    } catch (err) {
      console.error(`\nError processing ${file}:`, err.message);
    }
  }

  console.log(`\nSaving ${Object.keys(db).length} vectors to ${DB_PATH}...`);
  await fs.writeFile(DB_PATH, JSON.stringify(db));
  console.log("Done!");
}

main().catch(console.error);
