export type Severity = "high" | "medium" | "low";

export type Citation = {
  id: string;
  label: string;
  excerpt: string;
  page: number | null;
};

export type Deadline = {
  id: string;
  title: string;
  dateLabel: string;
  isoDate: string | null;
  detail: string;
  citationId: string;
};

export type ActionItem = {
  id: string;
  task: string;
  owner: string;
  due: string | null;
  citationId: string;
};

export type Risk = {
  id: string;
  risk: string;
  severity: Severity;
  citationId: string;
};

export type Brief = {
  title: string;
  summary: string;
  deadlines: Deadline[];
  actionItems: ActionItem[];
  risks: Risk[];
  citations: Citation[];
};

export type Chunk = {
  id: string;
  label: string;
  text: string;
  page: number | null;
};

export type RankedChunk = Chunk & { score: number };

export type RetrievalHit = {
  id: string;
  label: string;
  score: number;
  excerpt: string;
  page: number | null;
  used: boolean;
};

export type BriefResult = {
  mode: "llm" | "local";
  model: string | null;
  embedding: "openai" | "local";
  note: string;
  brief: Brief;
  retrieval: RetrievalHit[];
};

export type SourcePage = {
  page: number | null;
  text: string;
};
