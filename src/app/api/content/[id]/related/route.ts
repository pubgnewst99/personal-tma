import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Simple cosine similarity calculator
function cosineSimilarity(A: number[], B: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < A.length; i++) {
    dotProduct += A[i] * B[i];
    normA += A[i] * A[i];
    normB += B[i] * B[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const dbPath = path.join(process.cwd(), "vector_index.json");
    
    let dbRaw: string;
    try {
      dbRaw = await fs.readFile(dbPath, "utf-8");
    } catch {
      return NextResponse.json({ error: "Vector index not found. Run the generating script first." }, { status: 500 });
    }

    const { id } = await params;
    const db = JSON.parse(dbRaw) as Record<string, { title: string, source: string, vector: number[] }>;

    if (!db[id]) {
      return NextResponse.json({ error: "Article vector not found in index." }, { status: 404 });
    }

    const targetVector = db[id].vector;
    
    // Calculate similarities
    const results = Object.entries(db)
      .filter(([otherId]) => otherId !== id) // exclude self
      .map(([otherId, data]) => ({
        id: otherId,
        title: data.title,
        source: data.source,
        similarity: cosineSimilarity(targetVector, data.vector)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3); // Top 3

    return NextResponse.json(results);
  } catch (error) {
    console.error("Related fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
