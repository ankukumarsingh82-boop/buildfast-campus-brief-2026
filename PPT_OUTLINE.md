# Campus Brief Agent — 10-slide outline

## 1. Title

Campus Brief Agent. Build Fast with AI 2026. One line: upload a campus PDF or paste a class chat, get deadlines, actions, risks, and citations.

## 2. Problem

Notices and WhatsApp dumps hide dates inside prose. Students miss form deadlines, fines, and debarment rules. The cost is a blocked hall ticket, not a missed summary.

## 3. User and job

Primary user: a student or class representative who received a circular or a forwarded chat. Job: know what is due, who must act, and what happens if they do not, without rereading four pages.

## 4. Demo flow

Two inputs on one screen. Sample PDF and sample chat are one click. Output is a brief plus ranked source chunks. Optional focus question narrows the brief.

## 5. What a brief contains

Title and two-sentence summary. Deadlines sorted by date. Action items with an owner. Risks marked high or medium. Every item has a citation id that scrolls to the source excerpt.

## 6. Retrieval

Paragraph chunks, about 460 characters, kept per PDF page. Query and chunks are embedded. Cosine rank. A focus question keeps the top three chunks; a blank question reads the whole notice. The hostel question leaves scholarship text unused.

## 7. Model and fallback

`OPENAI_API_KEY` calls an OpenAI-compatible chat completion and asks for JSON that cites chunk ids. Embeddings use `/embeddings` when the key is present. With no key, or if the model call fails, a deterministic parser still returns the brief. The key is never written into the repo.

## 8. Stack

Next.js App Router and Tailwind. Node route handler. `unpdf` for PDF text. Zod for the model payload. Vitest for parsing, retrieval, and the sample PDF. Deploy target: Vercel.

## 9. What the demo proves

End-to-end path on a fictional three-page circular and a WhatsApp-style note. Issue dates and chat timestamps are not treated as deadlines. Consequences such as fines, debarment, and vacated rooms show up as risks. Tests cover those cases.

## 10. Next

Real ERP links per action, multi-notice memory for a student, and calendar export. Same citation rule: no date in the brief without a source chunk.
