import { createBrief } from "@/lib/brief";
import { extractPdfPages } from "@/lib/pdf";
import type { SourcePage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 40_000;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let question = "";
    let raw = "";
    let pages: SourcePage[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      question = String(form.get("question") || "");
      const pasted = String(form.get("text") || "");
      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        const name = file.name.toLowerCase();
        const type = file.type.toLowerCase();
        if (!name.endsWith(".pdf") && type !== "application/pdf") {
          return Response.json({ error: "Upload a PDF circular, or paste the notice text." }, { status: 415 });
        }
        if (file.size > MAX_PDF_BYTES) {
          return Response.json({ error: "PDF is larger than 8 MB." }, { status: 413 });
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        pages = await extractPdfPages(bytes);
        raw = pages.map((page) => page.text).join("\n\n").trim();
        if (raw.length < 20) {
          return Response.json(
            { error: "This PDF has no extractable text. Paste the notice instead." },
            { status: 422 },
          );
        }
      } else {
        raw = pasted.trim();
        pages = [{ page: null, text: raw }];
      }
    } else {
      const body = (await request.json()) as { text?: string; question?: string };
      question = String(body.question || "");
      raw = String(body.text || "").trim();
      pages = [{ page: null, text: raw }];
    }

    if (!raw) {
      return Response.json({ error: "Add a campus PDF or paste a notice first." }, { status: 400 });
    }
    if (raw.length > MAX_TEXT_CHARS) {
      return Response.json({ error: "Notice is too long. Keep it under 40,000 characters." }, { status: 413 });
    }

    const result = await createBrief({ raw, pages, question });
    return Response.json(result);
  } catch {
    return Response.json(
      { error: "Could not read that notice. Try the sample circular or paste the text." },
      { status: 500 },
    );
  }
}
