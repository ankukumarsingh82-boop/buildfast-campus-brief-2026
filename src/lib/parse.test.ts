import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { chunkPages } from "./chunk";
import { embedLocal } from "./embed";
import { briefToMarkdown } from "./format";
import { extractPdfPages } from "./pdf";
import {
  documentTitle,
  findDates,
  parseBrief,
  stripWhatsAppChrome,
} from "./parse";
import { rankChunks } from "./retrieve";
import { createBrief } from "./brief";

const root = resolve(__dirname, "../..");
const circular = readFileSync(resolve(root, "samples/campus-circular.txt"), "utf8").replace(
  /\n?---PAGE---\n?/g,
  "\n\n",
);
const whatsapp = readFileSync(resolve(root, "public/samples/whatsapp.txt"), "utf8");

function briefFrom(text: string) {
  const chunks = chunkPages([{ page: null, text }]);
  return parseBrief(text, chunks);
}

describe("campus notice parsing", () => {
  it("reads the circular subject and ignores the issue date", () => {
    const brief = briefFrom(circular);
    expect(documentTitle(circular)).toMatch(/Aether 2026/);
    expect(brief.deadlines.some((item) => item.isoDate === "2026-09-18")).toBe(false);
    expect(brief.deadlines.some((item) => item.isoDate === "2026-10-02" && /examination form/i.test(item.detail))).toBe(
      true,
    );
    expect(brief.deadlines[0]?.isoDate).toBe("2026-09-25");
    expect(brief.deadlines.every((item) => item.isoDate && /^\d{4}-\d{2}-\d{2}$/.test(item.isoDate))).toBe(true);
    expect(brief.deadlines.some((item) => item.isoDate === "2026-11-14" && /Aether/i.test(item.title))).toBe(true);
  });

  it("captures consequences as risks and undated obligations as actions", () => {
    const brief = briefFrom(circular);
    expect(brief.risks.some((risk) => risk.severity === "high" && /debar/i.test(risk.risk))).toBe(true);
    expect(brief.risks.some((risk) => risk.severity === "medium" && /fine/i.test(risk.risk))).toBe(true);
    expect(brief.risks.some((risk) => risk.severity === "high" && /vacated/i.test(risk.risk))).toBe(true);
    expect(brief.actionItems.some((item) => /abstract/i.test(item.task) && item.owner === "Team")).toBe(true);
    expect(brief.citations.length).toBeGreaterThan(1);
    expect(briefToMarkdown(brief)).toMatch(/2 October 2026/);
  });

  it("parses WhatsApp shorthand and drops the message timestamp", () => {
    const stripped = stripWhatsAppChrome(whatsapp);
    expect(stripped).not.toMatch(/21\/09\/26/);
    expect(findDates(stripped).some((date) => date.iso === "2026-09-21")).toBe(false);
    const withSeconds = whatsapp.replace("9:14 pm", "9:14:45 pm");
    const strippedSeconds = stripWhatsAppChrome(withSeconds);
    expect(strippedSeconds).not.toMatch(/21\/09\/26/);
    expect(findDates(strippedSeconds).some((date) => date.iso === "2026-09-21")).toBe(false);
    expect(briefFrom(withSeconds).deadlines.some((item) => item.isoDate === "2026-09-21")).toBe(false);
    const brief = briefFrom(whatsapp);
    expect(brief.title).toBe("Class chat brief");
    expect(brief.deadlines.some((item) => item.isoDate === "2026-09-21")).toBe(false);
    expect(brief.deadlines.some((item) => item.isoDate === "2026-09-27" && /CS301/i.test(item.detail))).toBe(true);
    expect(brief.deadlines[0]?.isoDate).toBe("2026-09-27");
    expect(brief.risks.some((risk) => risk.severity === "high" && /hall ticket|room gone|cannot sit/i.test(risk.risk))).toBe(
      true,
    );
    expect(brief.risks.some((risk) => risk.severity === "medium" && /500\/day|fine/i.test(risk.risk))).toBe(true);
  });
});

describe("chunk and retrieve", () => {
  it("ranks the hostel section above scholarship for a hostel question", () => {
    const chunks = chunkPages([{ page: null, text: circular }]);
    expect(chunks.some((chunk) => /vacated/i.test(chunk.text))).toBe(true);
    expect(chunks.some((chunk) => /scholarship cell/i.test(chunk.text) && !/vacated/i.test(chunk.text))).toBe(true);
    const vectors = chunks.map((chunk) => embedLocal(chunk.text));
    const ranked = rankChunks(
      chunks,
      vectors,
      embedLocal("What do I need to do for hostel allotment?"),
      chunks.length,
    );
    expect(ranked[0]?.text.toLowerCase()).toContain("hostel");
    const hostel = ranked.findIndex((chunk) => /hostel allotment/i.test(chunk.text));
    const scholarship = ranked.findIndex((chunk) => /scholarship cell/i.test(chunk.text));
    expect(hostel).toBeGreaterThanOrEqual(0);
    expect(scholarship).toBeGreaterThan(hostel);
  });

  it("keeps a focused brief on the retrieved hostel chunks", async () => {
    const result = await createBrief({
      raw: circular,
      pages: [{ page: null, text: circular }],
      question: "What do I need to do for hostel allotment?",
      offline: true,
    });
    expect(result.mode).toBe("local");
    expect(result.embedding).toBe("local");
    expect(result.retrieval[0]?.excerpt.toLowerCase()).toContain("hostel");
    expect(result.brief.deadlines.some((item) => /hostel|room|mess/i.test(`${item.title} ${item.detail}`))).toBe(true);
    expect(result.brief.deadlines.some((item) => /scholarship cell/i.test(item.detail))).toBe(false);
    expect(result.retrieval.some((hit) => hit.used)).toBe(true);
  });
});

describe("sample pdf", () => {
  it("extracts the fictional circular text", async () => {
    const bytes = new Uint8Array(readFileSync(resolve(root, "public/samples/campus-circular.pdf")));
    const pages = await extractPdfPages(bytes);
    expect(pages.length).toBeGreaterThanOrEqual(3);
    const raw = pages.map((page) => page.text).join("\n");
    expect(raw).toMatch(/Aether 2026/);
    expect(raw).toMatch(/hall ticket/i);
    const brief = parseBrief(raw, chunkPages(pages));
    expect(brief.deadlines.some((item) => item.isoDate === "2026-09-28" && item.title === "Tech fest Aether 2026")).toBe(
      true,
    );
    expect(
      brief.deadlines.some((item) => item.isoDate === "2026-10-02" && item.title === "End-semester examination form"),
    ).toBe(true);
    expect(brief.deadlines.every((item) => item.isoDate && /^\d{4}-\d{2}-\d{2}$/.test(item.isoDate))).toBe(true);
    expect(
      brief.risks.some((risk) => risk.severity === "high" && /confirm their room/i.test(risk.risk) && /vacated/i.test(risk.risk)),
    ).toBe(true);
  });
});
