import { z } from "zod";
import { bestCitation } from "./parse";
import type { Brief, Chunk, Severity } from "./types";

const severitySchema = z.enum(["high", "medium", "low"]);

const modelBriefSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  deadlines: z.array(
    z.object({
      title: z.string().min(1),
      dateLabel: z.string().min(1),
      isoDate: z.string().nullable().optional(),
      detail: z.string().min(1),
      citationId: z.string().min(1),
    }),
  ),
  actionItems: z.array(
    z.object({
      task: z.string().min(1),
      owner: z.string().min(1),
      due: z.string().nullable().optional(),
      citationId: z.string().min(1),
    }),
  ),
  risks: z.array(
    z.object({
      risk: z.string().min(1),
      severity: severitySchema,
      citationId: z.string().min(1),
    }),
  ),
});

const SYSTEM_PROMPT = `You are Campus Brief Agent for college notices and class-chat dumps.
Return a single JSON object with keys title, summary, deadlines, actionItems, risks.
deadlines items: title, dateLabel, isoDate (YYYY-MM-DD or null), detail, citationId.
actionItems items: task, owner, due (string or null), citationId.
risks items: risk, severity (high, medium, or low), citationId.
citationId must be one of the chunk ids in the user message.
Only include deadlines, actions, and risks supported by those chunks.
summary is two sentences: what the student must do, and the sharpest consequence.
Do not invent dates, fines, or owners.`;

function extractJson(content: string): unknown {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Model did not return JSON");
  return JSON.parse(content.slice(start, end + 1));
}

function normalizeSeverity(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as { risks?: unknown };
  if (!Array.isArray(record.risks)) return value;
  record.risks = record.risks.map((risk) => {
    if (!risk || typeof risk !== "object" || !("severity" in risk)) return risk;
    const severity = (risk as { severity?: unknown }).severity;
    if (typeof severity !== "string") return risk;
    return { ...risk, severity: severity.toLowerCase() };
  });
  return record;
}

async function chat(messages: Array<{ role: "system" | "user"; content: string }>, jsonMode: boolean) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("missing key");
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const body: Record<string, unknown> = {
    model,
    temperature: 0.1,
    messages,
    max_tokens: 1800,
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const error = new Error(`chat ${response.status}`) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty completion");
  return { content, model };
}

export async function writeBriefWithModel(
  chunks: Chunk[],
  question: string | undefined,
  fallback: Brief,
): Promise<{ brief: Brief; model: string }> {
  const packed = chunks
    .map((chunk) => `[${chunk.id}] ${chunk.label}\n${chunk.text}`)
    .join("\n\n");
  const user = [
    question?.trim() ? `Student question: ${question.trim()}` : "Student question: summarize the notice.",
    "",
    "Chunks:",
    packed,
  ].join("\n");
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: user },
  ];

  let content: string;
  let model: string;
  try {
    const completion = await chat(messages, true);
    content = completion.content;
    model = completion.model;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status !== 400) throw error;
    const completion = await chat(messages, false);
    content = completion.content;
    model = completion.model;
  }

  const parsed = modelBriefSchema.parse(normalizeSeverity(extractJson(content)));
  const allowed = new Set(chunks.map((chunk) => chunk.id));
  const cite = (citationId: string, text: string) =>
    allowed.has(citationId) ? citationId : bestCitation(text, chunks);

  const brief: Brief = {
    title: parsed.title,
    summary: parsed.summary,
    deadlines: parsed.deadlines.map((deadline, index) => ({
      id: `d${index + 1}`,
      title: deadline.title,
      dateLabel: deadline.dateLabel,
      isoDate: deadline.isoDate ?? null,
      detail: deadline.detail,
      citationId: cite(deadline.citationId, deadline.detail),
    })),
    actionItems: parsed.actionItems.map((item, index) => ({
      id: `a${index + 1}`,
      task: item.task,
      owner: item.owner,
      due: item.due ?? null,
      citationId: cite(item.citationId, item.task),
    })),
    risks: parsed.risks.map((risk, index) => ({
      id: `r${index + 1}`,
      risk: risk.risk,
      severity: risk.severity as Severity,
      citationId: cite(risk.citationId, risk.risk),
    })),
    citations: fallback.citations.filter((citation) => allowed.has(citation.id)),
  };

  if (brief.deadlines.length === 0 && fallback.deadlines.length > 0) return { brief: fallback, model };
  if (brief.actionItems.length === 0) brief.actionItems = fallback.actionItems;
  if (brief.risks.length === 0) brief.risks = fallback.risks;
  if (brief.citations.length === 0) brief.citations = fallback.citations;
  return { brief, model };
}
