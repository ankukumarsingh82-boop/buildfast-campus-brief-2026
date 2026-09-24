import type { Chunk, SourcePage } from "./types";

export function splitForChunks(text: string, size = 560): string[] {
  const lines = text.replace(/\r/g, "").replace(/\n?---PAGE---\n?/g, "\n\n").split("\n");
  const chunks: string[] = [];
  let buffer: string[] = [];
  let length = 0;

  const headingOnly = () => {
    const filled = buffer.map((item) => item.trim()).filter(Boolean);
    return filled.length > 0 && filled.every((item) => /^\d{1,2}\.\s+[A-Za-z]/.test(item));
  };

  const flush = () => {
    const joined = buffer.join("\n").trim();
    if (joined) chunks.push(joined);
    buffer = [];
    length = 0;
  };

  for (const line of lines) {
    if (!line.trim()) {
      if (buffer.length > 0 && buffer[buffer.length - 1] !== "") buffer.push("");
      continue;
    }
    if (line.length > size) {
      const heading = headingOnly() ? buffer.map((item) => item.trim()).filter(Boolean).at(-1) : "";
      if (heading) {
        buffer = [];
        length = 0;
      } else flush();
      for (const piece of splitLong(line, size, 40)) {
        chunks.push(heading ? `${heading}\n${piece}` : piece);
      }
      continue;
    }
    const startsSection = /^\d{1,2}\.\s+[A-Za-z]/.test(line);
    if (startsSection && buffer.some((item) => /^\d{1,2}\.\s+[A-Za-z]/.test(item))) flush();
    if (length > 0 && length + line.length + 1 > size && !headingOnly()) flush();
    buffer.push(line);
    length += line.length + 1;
  }
  flush();
  return chunks;
}

function splitLong(paragraph: string, size: number, overlap: number): string[] {
  if (paragraph.length <= size) return [paragraph];
  const parts: string[] = [];
  let index = 0;
  while (index < paragraph.length) {
    let end = Math.min(index + size, paragraph.length);
    if (end < paragraph.length) {
      const breakAt = paragraph.lastIndexOf(". ", end);
      if (breakAt > index + Math.floor(size * 0.45)) end = breakAt + 1;
    }
    const piece = paragraph.slice(index, end).trim();
    if (piece) parts.push(piece);
    if (end >= paragraph.length) break;
    index = Math.max(end - overlap, index + 1);
  }
  return parts;
}

export function chunkPages(pages: SourcePage[], size = 560): Chunk[] {
  const chunks: Chunk[] = [];
  for (const page of pages) {
    for (const text of splitForChunks(page.text, size)) {
      const number = chunks.length + 1;
      const heading = text
        .split("\n")
        .map((line) => line.trim())
        .find((line) => /^\d{1,2}\.\s+[A-Za-z]/.test(line));
      const label = heading
        ? heading.replace(/\.$/, "")
        : page.page
          ? `Page ${page.page} · excerpt ${number}`
          : `Excerpt ${number}`;
      chunks.push({
        id: `c${number}`,
        label,
        text,
        page: page.page,
      });
    }
  }
  return chunks;
}
