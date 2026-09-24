const DIM = 512;

const STOP = new Set(
  "a an the of to and for on by with this that from will be is are in or at as it if not your you we our".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP.has(token));
}

function bucket(token: string): number {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % DIM;
}

/** Hashed unigram + bigram embedding. Used when no API key is configured. */
export function embedLocal(text: string): number[] {
  const vector = new Array<number>(DIM).fill(0);
  const tokens = tokenize(text);
  for (let index = 0; index < tokens.length; index += 1) {
    vector[bucket(tokens[index])] += 1;
    if (index + 1 < tokens.length) {
      vector[bucket(`${tokens[index]}_${tokens[index + 1]}`)] += 0.6;
    }
  }
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return vector.map((value) => value / norm);
}

export function cosine(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let score = 0;
  for (let index = 0; index < length; index += 1) score += left[index] * right[index];
  return score;
}

export async function embedTexts(
  texts: string[],
  options?: { localOnly?: boolean },
): Promise<{ vectors: number[][]; provider: "openai" | "local" }> {
  const key = process.env.OPENAI_API_KEY;
  if (options?.localOnly || !key || texts.length === 0) {
    return { vectors: texts.map((text) => embedLocal(text)), provider: "local" };
  }

  try {
    const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
    const response = await fetch(`${base}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: texts }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`embeddings ${response.status}`);
    const payload = (await response.json()) as {
      data?: Array<{ index: number; embedding: number[] }>;
    };
    const data = [...(payload.data ?? [])].sort((left, right) => left.index - right.index);
    if (data.length !== texts.length || data.some((item) => !Array.isArray(item.embedding))) {
      throw new Error("embeddings shape");
    }
    return { vectors: data.map((item) => item.embedding), provider: "openai" };
  } catch {
    return { vectors: texts.map((text) => embedLocal(text)), provider: "local" };
  }
}
