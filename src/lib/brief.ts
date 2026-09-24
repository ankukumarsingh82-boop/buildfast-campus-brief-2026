import { chunkPages } from "./chunk";
import { embedTexts } from "./embed";
import { excerpt, parseBrief } from "./parse";
import { writeBriefWithModel } from "./llm";
import { rankChunks } from "./retrieve";
import type { BriefResult, SourcePage } from "./types";

const FOCUS_LIMIT = 3;

export function isFocusedQuestion(question: string | undefined): boolean {
  const value = question?.trim() ?? "";
  if (value.length < 8) return false;
  return !/^(summarise|summarize|full brief|entire notice|overview)$/i.test(value);
}

export async function createBrief(input: {
  raw: string;
  pages: SourcePage[];
  question?: string;
  offline?: boolean;
}): Promise<BriefResult> {
  const question = input.question?.trim() ?? "";
  const chunks = chunkPages(input.pages.length > 0 ? input.pages : [{ page: null, text: input.raw }]);
  const usable = chunks.filter((chunk) => chunk.text.trim().length > 0);
  const queryText =
    question ||
    "deadlines action items risks fees examinations hostel scholarship registration hall ticket";
  const offline = input.offline === true || !process.env.OPENAI_API_KEY;
  const embedded = await embedTexts([queryText, ...usable.map((chunk) => chunk.text)], {
    localOnly: offline,
  });
  const ranked = rankChunks(usable, embedded.vectors.slice(1), embedded.vectors[0] ?? [], usable.length);
  const focused = isFocusedQuestion(question);
  const bestScore = ranked[0]?.score ?? 0;
  const selected = focused
    ? ranked
        .filter((chunk) => chunk.score > 0.02 && chunk.score >= bestScore * 0.62)
        .slice(0, FOCUS_LIMIT)
    : ranked;
  if (focused && selected.length === 0 && ranked[0]) selected.push(ranked[0]);
  const selectedIds = new Set(selected.map((chunk) => chunk.id));
  const context = selected.map((chunk) => chunk.text).join("\n\n---SECTION---\n\n");
  const localBrief = parseBrief(
    focused ? context || input.raw : input.raw,
    focused ? selected : usable,
    focused ? question : undefined,
  );
  if (!localBrief.title || localBrief.title === "Campus brief") {
    localBrief.title = parseBrief(input.raw, []).title;
  }

  let mode: BriefResult["mode"] = "local";
  let model: string | null = null;
  let brief = localBrief;
  let note =
    "Brief written by the local campus parser. Retrieval used hashed n-gram embeddings on this server. Set OPENAI_API_KEY to use an OpenAI-compatible model.";

  if (!offline) {
    try {
      const written = await writeBriefWithModel(selected, question, localBrief);
      brief = written.brief;
      model = written.model;
      mode = "llm";
      note = `Brief written by ${written.model} from the retrieved chunks.`;
    } catch {
      note =
        "The model request failed, so this brief was written by the local parser. Chunk retrieval still ran.";
    }
  }

  if (embedded.provider === "openai" && mode === "llm") {
    note = `${note} Embeddings: ${process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"}.`;
  }

  return {
    mode,
    model,
    embedding: embedded.provider,
    note,
    brief,
    retrieval: ranked.map((chunk) => ({
      id: chunk.id,
      label: chunk.label,
      score: Number(chunk.score.toFixed(4)),
      excerpt: excerpt(chunk.text, 180),
      page: chunk.page,
      used: selectedIds.has(chunk.id),
    })),
  };
}
