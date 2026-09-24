import { cosine } from "./embed";
import type { Chunk, RankedChunk } from "./types";

export function rankChunks(
  chunks: Chunk[],
  vectors: number[][],
  query: number[],
  limit = 4,
): RankedChunk[] {
  return chunks
    .map((chunk, index) => ({
      ...chunk,
      score: cosine(vectors[index] ?? [], query),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
