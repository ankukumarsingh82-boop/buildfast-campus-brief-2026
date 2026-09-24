"use client";

import { useMemo, useState, type ReactNode } from "react";
import { briefToMarkdown } from "@/lib/format";
import type { BriefResult, Severity } from "@/lib/types";

const FOCUS_CHIPS = [
  "What do I need to do for hostel allotment?",
  "What happens if fees are late?",
  "Aether registration",
];

export function BriefApp() {
  const [text, setText] = useState("");
  const [question, setQuestion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BriefResult | null>(null);
  const [activeCitation, setActiveCitation] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const markdown = useMemo(() => (result ? briefToMarkdown(result.brief) : ""), [result]);

  async function analyze(next: { file: File | null; text: string; question: string }) {
    setLoading(true);
    setError(null);
    setCopied(false);
    const body = new FormData();
    if (next.file) body.set("file", next.file);
    if (next.text.trim()) body.set("text", next.text);
    body.set("question", next.question);
    try {
      const response = await fetch("/api/brief", { method: "POST", body });
      const payload = (await response.json()) as BriefResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not build a brief.");
      setResult(payload);
      setActiveCitation(payload.brief.deadlines[0]?.citationId ?? payload.brief.citations[0]?.id ?? null);
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : "Could not build a brief.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSamplePdf() {
    const response = await fetch("/samples/campus-circular.pdf");
    const blob = await response.blob();
    const sample = new File([blob], "campus-circular.pdf", { type: "application/pdf" });
    setFile(sample);
    setText("");
    await analyze({ file: sample, text: "", question });
  }

  async function loadSampleChat() {
    const response = await fetch("/samples/whatsapp.txt");
    const sample = await response.text();
    setFile(null);
    setText(sample);
    await analyze({ file: null, text: sample, question });
  }

  function onFile(next: File | null) {
    if (!next) return;
    setFile(next);
    setText("");
  }

  async function copyBrief() {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-moss uppercase">Build Fast with AI 2026</p>
          <h1 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">Campus Brief Agent</h1>
          <p className="mt-2 max-w-xl text-base text-muted">
            Turn a registrar circular or a class-chat dump into deadlines, action items, risks, and the lines they came from.
          </p>
        </div>
        <p className="max-w-xs text-sm text-muted">
          Works without an API key using a local parser. Add <code className="text-ink">OPENAI_API_KEY</code> for a model-written brief.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section className="rounded-3xl border border-line bg-card p-5 shadow-[0_18px_50px_rgba(28,25,21,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl">Intake</h2>
            <div className="flex gap-2">
              <button type="button" className="chip" onClick={() => void loadSamplePdf()} disabled={loading}>
                Sample PDF
              </button>
              <button type="button" className="chip" onClick={() => void loadSampleChat()} disabled={loading}>
                Sample chat
              </button>
            </div>
          </div>

          <label
            className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-moss/40 bg-sand/60 px-4 py-6 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              onFile(event.dataTransfer.files?.[0] ?? null);
            }}
          >
            <span className="font-medium text-ink">Drop a campus PDF</span>
            <span className="mt-1 text-sm text-muted">or click to choose a file, up to 8 MB</span>
            <input
              className="sr-only"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => onFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {file ? (
            <p className="mt-3 flex items-center justify-between gap-3 text-sm">
              <span>
                Using <strong>{file.name}</strong>
              </span>
              <button type="button" className="text-copper underline" onClick={() => setFile(null)}>
                Remove
              </button>
            </p>
          ) : null}

          <label className="mt-5 block text-sm font-medium" htmlFor="notice">
            Or paste WhatsApp-style text
          </label>
          <textarea
            id="notice"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (event.target.value.trim()) setFile(null);
            }}
            rows={8}
            placeholder="exam form last date 2 oct 5pm..."
            className="mt-2 w-full resize-y rounded-2xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-moss"
          />

          <label className="mt-4 block text-sm font-medium" htmlFor="question">
            Optional focus
          </label>
          <input
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What should the brief focus on?"
            className="mt-2 w-full rounded-2xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-moss"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {FOCUS_CHIPS.map((chip) => (
              <button key={chip} type="button" className="chip" onClick={() => setQuestion(chip)}>
                {chip}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="mt-5 w-full rounded-2xl bg-moss-deep px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            disabled={loading || (!file && !text.trim())}
            onClick={() => void analyze({ file, text, question })}
          >
            {loading ? "Reading the notice..." : "Build brief"}
          </button>
          {error ? (
            <p role="alert" className="mt-3 text-sm text-copper">
              {error}
            </p>
          ) : null}
        </section>

        <section aria-live="polite" className="rounded-3xl border border-line bg-card p-5 shadow-[0_18px_50px_rgba(28,25,21,0.05)]">
          {!result ? (
            <EmptyBrief />
          ) : (
            <article>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-moss uppercase">
                    {result.mode === "llm" ? `Model · ${result.model}` : "Local parser"} ·{" "}
                    {result.embedding === "openai" ? "API embeddings" : "local embeddings"}
                  </p>
                  <h2 className="mt-1 font-serif text-3xl leading-tight">{result.brief.title}</h2>
                </div>
                <button type="button" className="chip" onClick={() => void copyBrief()}>
                  {copied ? "Copied" : "Copy markdown"}
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{result.brief.summary}</p>
              <p className="mt-2 text-xs text-muted">{result.note}</p>

              <BriefList title="Deadlines" empty="No dated items in the retrieved text.">
                {result.brief.deadlines.map((deadline) => (
                  <li key={deadline.id} className="grid grid-cols-[7.5rem_1fr] gap-3 border-t border-line py-3">
                    <time className="font-mono text-xs leading-5 text-moss-deep" dateTime={deadline.isoDate ?? undefined}>
                      {deadline.dateLabel}
                    </time>
                    <div>
                      <p className="font-medium">{deadline.title}</p>
                      <p className="mt-1 text-sm text-muted">{deadline.detail}</p>
                      <CiteButton id={deadline.citationId} onSelect={setActiveCitation} />
                    </div>
                  </li>
                ))}
              </BriefList>

              <BriefList title="Action items" empty="No actions in the retrieved text.">
                {result.brief.actionItems.map((item) => (
                  <li key={item.id} className="border-t border-line py-3">
                    <p>{item.task}</p>
                    <p className="mt-1 text-sm text-muted">
                      {item.owner}
                      {item.due ? ` · ${item.due}` : ""}
                    </p>
                    <CiteButton id={item.citationId} onSelect={setActiveCitation} />
                  </li>
                ))}
              </BriefList>

              <BriefList title="Risks" empty="No consequences spotted.">
                {result.brief.risks.map((risk) => (
                  <li key={risk.id} className="flex gap-3 border-t border-line py-3">
                    <SeverityMark severity={risk.severity} />
                    <div>
                      <p className="text-sm">{risk.risk}</p>
                      <CiteButton id={risk.citationId} onSelect={setActiveCitation} />
                    </div>
                  </li>
                ))}
              </BriefList>

              <h3 className="mt-6 font-serif text-xl">Sources</h3>
              <ul className="mt-2 space-y-2">
                {result.retrieval.map((hit) => (
                  <li
                    key={hit.id}
                    id={`citation-${hit.id}`}
                    className={`rounded-2xl border px-3 py-3 text-sm ${
                      activeCitation === hit.id ? "border-moss bg-sand" : "border-line bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">
                        {hit.id} · {hit.label}
                        {hit.page ? ` · page ${hit.page}` : ""}
                      </p>
                      <p className="font-mono text-xs text-muted">
                        {hit.used ? "used" : "retrieved"} · {hit.score.toFixed(2)}
                      </p>
                    </div>
                    <p className="mt-1 text-muted">{hit.excerpt}</p>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyBrief() {
  return (
    <div>
      <h2 className="font-serif text-3xl">The brief appears here</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Load the sample circular or the class chat. Each deadline stays tied to the chunk it was read from.
      </p>
      <ul className="mt-6 space-y-3 text-sm">
        <li className="rounded-2xl bg-sand px-4 py-3">Deadlines, sorted by date</li>
        <li className="rounded-2xl bg-sand px-4 py-3">Action items with an owner</li>
        <li className="rounded-2xl bg-sand px-4 py-3">Risks marked high or medium</li>
      </ul>
    </div>
  );
}

function BriefList({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const filled = items.some(Boolean);
  return (
    <section className="mt-6">
      <h3 className="font-serif text-xl">{title}</h3>
      {filled ? <ul className="mt-1">{children}</ul> : <p className="mt-2 text-sm text-muted">{empty}</p>}
    </section>
  );
}

function CiteButton({ id, onSelect }: { id: string; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      className="mt-2 text-xs font-semibold tracking-wide text-moss uppercase"
      onClick={() => {
        onSelect(id);
        document.getElementById(`citation-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }}
    >
      Source {id}
    </button>
  );
}

function SeverityMark({ severity }: { severity: Severity }) {
  const tone =
    severity === "high" ? "bg-copper text-white" : severity === "medium" ? "bg-sand text-copper" : "bg-moss text-white";
  return <span className={`mt-0.5 h-fit rounded-full px-2 py-1 text-[10px] font-bold tracking-wide uppercase ${tone}`}>{severity}</span>;
}
