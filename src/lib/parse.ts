import type { ActionItem, Brief, Chunk, Deadline, Risk, Severity } from "./types";

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const MONTH_PATTERN =
  "january|february|march|april|may|june|july|august|september|sept|sep|october|oct|november|nov|december|dec|jan|feb|mar|apr|jun|jul|aug";

const HIGH_RISK = [
  "debar",
  "hall ticket",
  "not be accepted",
  "not be issued",
  "rejected",
  "vacated",
  "blocked",
  "cannot sit",
  "withhold",
  "room gone",
  "no hall ticket",
];

const MEDIUM_RISK = ["fine", "penalty", "per day", "500/day", "incomplete", "will not be reviewed"];

const ACTION_PATTERN =
  /\b(must|submit|upload|pay|payable|confirm|obtain|apply|register|registration|complete)\b/i;

export type FoundDate = {
  iso: string;
  label: string;
  index: number;
};

type Span = FoundDate & { end: number };

type Segment = {
  heading: string | null;
  text: string;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toIso(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || year < 2000 || year > 2100) return null;
  const maxDay = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
  if (day > maxDay) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function overlaps(spans: Span[], index: number, end: number): boolean {
  return spans.some((span) => index < span.end && end > span.index);
}

function absorbTime(text: string, label: string, end: number): { label: string; end: number } {
  const after = text.slice(end, end + 22);
  const match = after.match(/^\s*,?\s*(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
  if (!match) return { label, end };
  return {
    label: `${label}, ${match[1].replace(/\s+/g, " ")}`,
    end: end + match[0].length,
  };
}

export function findDates(text: string, defaultYear = 2026): FoundDate[] {
  const spans: Span[] = [];
  const consider = (index: number, end: number, label: string, iso: string | null) => {
    if (!iso || overlaps(spans, index, end)) return;
    const timed = absorbTime(text, label, end);
    spans.push({
      iso,
      label: timed.label.replace(/[.,;]+$/g, ""),
      index,
      end: timed.end,
    });
  };

  const range = new RegExp(
    `\\b(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s+(${MONTH_PATTERN})\\.?\\s*,?\\s*(\\d{4})\\b`,
    "gi",
  );
  const named = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})\\.?\\s*,?\\s*(\\d{4})\\b`,
    "gi",
  );
  const namedShort = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})\\b\\.?`,
    "gi",
  );
  const numeric = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/g;

  for (const match of text.matchAll(range)) {
    const index = match.index ?? 0;
    const month = MONTHS[match[3].toLowerCase()];
    consider(
      index,
      index + match[0].length,
      match[0],
      toIso(Number(match[4]), month, Number(match[1])),
    );
  }

  for (const match of text.matchAll(named)) {
    const index = match.index ?? 0;
    const month = MONTHS[match[2].toLowerCase()];
    consider(
      index,
      index + match[0].length,
      match[0],
      toIso(Number(match[3]), month, Number(match[1])),
    );
  }

  for (const match of text.matchAll(namedShort)) {
    const index = match.index ?? 0;
    const end = index + match[0].length;
    if (/^\s*,?\s*\d{4}/.test(text.slice(end, end + 8))) continue;
    const month = MONTHS[match[2].toLowerCase()];
    consider(index, end, match[0], toIso(defaultYear, month, Number(match[1])));
  }

  for (const match of text.matchAll(numeric)) {
    const index = match.index ?? 0;
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    consider(
      index,
      index + match[0].length,
      match[0],
      toIso(year, Number(match[2]), Number(match[1])),
    );
  }

  return spans
    .sort((left, right) => left.index - right.index)
    .map(({ iso, label, index }) => ({ iso, label, index }));
}

export function stripWhatsAppChrome(text: string): string {
  return text.replace(
    /\[\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4},\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?\]\s*[^:\n]{0,60}:\s*/gi,
    "",
  );
}

export function documentTitle(raw: string): string {
  const subject = raw.match(/subject:\s*([^\n]+)/i);
  if (subject) return subject[1].trim().replace(/\.$/, "");
  if (/\[\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4},/.test(raw)) return "Class chat brief";
  const line = stripWhatsAppChrome(raw)
    .split(/\n/)
    .map((item) => item.trim())
    .find((item) => item.length > 8 && !/^date\s*:/i.test(item));
  return line?.slice(0, 110) || "Campus brief";
}

function relevantDates(text: string): FoundDate[] {
  const dates = findDates(text);
  if (!/^\s*date\s*:/i.test(text)) return dates;
  const signal = text.search(/\b(must|submit|due|deadline|by|before|closes|opens|fine|debar|pay)\b/i);
  if (signal < 0) return [];
  return dates.filter((date) => date.index >= signal);
}

function isHeading(line: string): boolean {
  if (line.length < 4 || line.length > 72) return false;
  if (/[.!?]$/.test(line)) return false;
  if (findDates(line).length > 0) return false;
  if (/^\d{1,2}\.\s+[A-Za-z]/.test(line)) return true;
  return line === line.toUpperCase() && /[A-Z]/.test(line);
}

export function segmentDocument(raw: string): Segment[] {
  const lines = stripWhatsAppChrome(raw)
    .replace(/\r/g, "")
    .replace(/\n?---PAGE---\n?/g, "\n\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const segments: Segment[] = [];
  let heading: string | null = null;
  for (const line of lines) {
    if (line === "---SECTION---") {
      heading = null;
      continue;
    }
    if (isHeading(line)) {
      heading = line.replace(/^\d{1,2}\.\s*/, "");
      continue;
    }
    const sentences = line
      .split(/(?<=[.!?])\s+(?=[A-Za-z0-9])/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length >= 8);
    for (const sentence of sentences) segments.push({ heading, text: sentence });
  }
  return segments;
}

export function classifyRisk(text: string): Severity | null {
  const haystack = text.toLowerCase();
  if (HIGH_RISK.some((keyword) => haystack.includes(keyword))) return "high";
  if (MEDIUM_RISK.some((keyword) => haystack.includes(keyword))) return "medium";
  return null;
}

export function inferOwner(text: string): string {
  const haystack = text.toLowerCase();
  if (/\bteams?\b/.test(haystack)) return "Team";
  if (haystack.includes("faculty")) return "Faculty mentor";
  if (haystack.includes("scholarship cell")) return "Scholarship cell";
  if (haystack.includes("class rep")) return "Class representative";
  if (haystack.includes("student")) return "Students";
  return "Student";
}

export function bestCitation(segment: string, chunks: Chunk[]): string {
  if (chunks.length === 0) return "c1";
  const needle = segment.toLowerCase().replace(/\s+/g, " ").trim();
  let best = chunks[0];
  let bestScore = -1;
  for (const chunk of chunks) {
    const haystack = chunk.text.toLowerCase().replace(/\s+/g, " ");
    let score = 0;
    if (needle && haystack.includes(needle.slice(0, 70))) score += 100;
    for (const token of needle.split(" ")) {
      if (token.length > 3 && haystack.includes(token)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = chunk;
    }
  }
  return best.id;
}

export function excerpt(text: string, max = 220): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trim()}...`;
}

function deadlineTitle(heading: string | null, sentence: string, date: FoundDate): string {
  if (heading) return heading;
  const lead = sentence
    .slice(0, date.index)
    .replace(/^(also|and|then|guys)\s+/i, "")
    .replace(/\b(is|on|by|before|till|until|last date|closes|opens)\s*$/i, "")
    .replace(/[\s,.:;-]+$/g, "")
    .replace(/^[\s,.:;-]+/g, "")
    .trim();
  if (lead.length >= 6) return lead.length <= 88 ? lead : `${lead.slice(0, 85).trim()}...`;
  const stripped = sentence
    .replace(date.label, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,;:]+$/, "");
  if (stripped.length <= 88) return stripped || sentence;
  return `${stripped.slice(0, 85).trim()}...`;
}

export function parseBrief(raw: string, chunks: Chunk[], focus?: string): Brief {
  const usable = chunks.filter((chunk) => chunk.text.trim().length > 0);
  const contextChunks =
    usable.length > 0 ? usable : [{ id: "c1", label: "Notice", text: raw, page: null }];
  const segments = segmentDocument(raw);
  const deadlines: Deadline[] = [];
  const risks: Risk[] = [];
  const extraActions: ActionItem[] = [];
  const deadlineSentences = new Set<string>();

  for (const segment of segments) {
    const dates = relevantDates(segment.text);
    const riskLevel = classifyRisk(segment.text);
    if (riskLevel) {
      risks.push({
        id: `r${risks.length + 1}`,
        risk: segment.text,
        severity: riskLevel,
        citationId: bestCitation(segment.text, contextChunks),
      });
    }
    if (dates.length === 0) {
      if (ACTION_PATTERN.test(segment.text)) {
        extraActions.push({
          id: "",
          task: segment.text,
          owner: inferOwner(segment.text),
          due: null,
          citationId: bestCitation(segment.text, contextChunks),
        });
      }
      continue;
    }

    deadlineSentences.add(segment.text);
    for (const date of dates) {
      deadlines.push({
        id: `d${deadlines.length + 1}`,
        title: deadlineTitle(segment.heading, segment.text, date),
        dateLabel: date.label,
        isoDate: date.iso,
        detail: segment.text,
        citationId: bestCitation(segment.text, contextChunks),
      });
    }
  }

  const uniqueDeadlines: Deadline[] = [];
  const seenDeadlines = new Set<string>();
  for (const deadline of deadlines) {
    const key = `${deadline.isoDate}|${deadline.detail.toLowerCase()}`;
    if (seenDeadlines.has(key)) continue;
    seenDeadlines.add(key);
    uniqueDeadlines.push(deadline);
  }
  deadlines.length = 0;
  deadlines.push(...uniqueDeadlines);

  deadlines.sort((left, right) => {
    if (left.isoDate && right.isoDate) {
      return left.isoDate.localeCompare(right.isoDate) || left.title.localeCompare(right.title);
    }
    if (left.isoDate) return -1;
    if (right.isoDate) return 1;
    return left.title.localeCompare(right.title);
  });
  deadlines.forEach((deadline, index) => {
    deadline.id = `d${index + 1}`;
  });

  const actionItems: ActionItem[] = deadlines.map((deadline, index) => ({
    id: `a${index + 1}`,
    task: deadline.detail,
    owner: inferOwner(`${deadline.title} ${deadline.detail}`),
    due: deadline.dateLabel,
    citationId: deadline.citationId,
  }));

  for (const extra of extraActions) {
    if (deadlineSentences.has(extra.task)) continue;
    actionItems.push({ ...extra, id: `a${actionItems.length + 1}` });
  }

  const seenRisk = new Set<string>();
  const uniqueRisks: Risk[] = [];
  for (const risk of risks) {
    const key = risk.risk.toLowerCase();
    if (seenRisk.has(key)) continue;
    seenRisk.add(key);
    uniqueRisks.push({ ...risk, id: `r${uniqueRisks.length + 1}` });
  }

  const nearest = deadlines[0];
  const highCount = uniqueRisks.filter((risk) => risk.severity === "high").length;
  const summary = [
    focus?.trim() ? `Focused on "${focus.trim()}".` : "",
    `Found ${deadlines.length} dated item${deadlines.length === 1 ? "" : "s"} and ${uniqueRisks.length} risk${uniqueRisks.length === 1 ? "" : "s"}${highCount ? ` (${highCount} high)` : ""}.`,
    nearest
      ? `Next up: ${nearest.title} (${nearest.dateLabel}).`
      : "No dated deadlines were found in this note.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    title: documentTitle(raw),
    summary,
    deadlines,
    actionItems,
    risks: uniqueRisks,
    citations: contextChunks.map((chunk) => ({
      id: chunk.id,
      label: chunk.label,
      excerpt: excerpt(chunk.text),
      page: chunk.page,
    })),
  };
}
