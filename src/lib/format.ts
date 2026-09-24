import type { Brief } from "./types";

export function briefToMarkdown(brief: Brief): string {
  const lines = [`# ${brief.title}`, "", brief.summary, "", "## Deadlines"];
  if (brief.deadlines.length === 0) lines.push("- None found");
  for (const deadline of brief.deadlines) {
    lines.push(
      `- **${deadline.dateLabel}** — ${deadline.title}. ${deadline.detail} (${deadline.citationId})`,
    );
  }
  lines.push("", "## Action items");
  if (brief.actionItems.length === 0) lines.push("- None found");
  for (const item of brief.actionItems) {
    const due = item.due ? ` · due ${item.due}` : "";
    lines.push(`- ${item.task} (${item.owner}${due}) (${item.citationId})`);
  }
  lines.push("", "## Risks");
  if (brief.risks.length === 0) lines.push("- None found");
  for (const risk of brief.risks) {
    lines.push(`- **${risk.severity}** — ${risk.risk} (${risk.citationId})`);
  }
  lines.push("", "## Citations");
  for (const citation of brief.citations) {
    const page = citation.page ? `page ${citation.page}` : "pasted text";
    lines.push(`- ${citation.id} · ${citation.label} (${page}): ${citation.excerpt}`);
  }
  return lines.join("\n");
}
