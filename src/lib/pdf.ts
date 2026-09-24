import { extractText, getDocumentProxy } from "unpdf";
import type { SourcePage } from "./types";

function isStructuralLine(line: string): boolean {
  if (/^\d{1,2}\.\s+[A-Za-z]/.test(line)) return true;
  if (/^(subject|contact|date|circular)\b/i.test(line)) return true;
  return line === line.toUpperCase() && /[A-Z]/.test(line) && line.length < 90;
}

/** Join visual line wraps from PDF text extraction without merging headings or new sentences. */
export function reflowPdfText(text: string): string {
  const out: string[] = [];
  for (const rawLine of text.split(/\n/)) {
    const line = rawLine.trim();
    if (!line || /^fictional sample notice/i.test(line)) continue;
    const prevTrim = (out.at(-1) ?? "").trim();
    const wrapped =
      prevTrim.length > 0 &&
      !/[.!?]$/.test(prevTrim) &&
      !isStructuralLine(prevTrim) &&
      !isStructuralLine(line);
    if (wrapped) out[out.length - 1] = `${prevTrim} ${line}`;
    else out.push(line);
  }
  return out.join("\n").trim();
}

export async function extractPdfPages(data: Uint8Array): Promise<SourcePage[]> {
  const pdf = await getDocumentProxy(data);
  const result = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(result.text) ? result.text : [result.text ?? ""];
  return pages.map((text, index) => ({
    page: index + 1,
    text: reflowPdfText(text ?? ""),
  }));
}
