import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(resolve(root, "samples/campus-circular.txt"), "utf8");
const pages = raw.split(/\n---PAGE---\n/);

function wrap(text, width) {
  const lines = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > width) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

for (const pageText of pages) {
  const page = doc.addPage([595.28, 841.89]);
  page.drawRectangle({
    x: 0,
    y: 790,
    width: 595.28,
    height: 52,
    color: rgb(0.114, 0.322, 0.243),
  });
  page.drawText("INDIRA INSTITUTE OF TECHNOLOGY  |  OFFICE OF STUDENT AFFAIRS", {
    x: 48,
    y: 812,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  let y = 760;
  for (const line of wrap(pageText, 86)) {
    if (!line.trim()) {
      y -= 10;
      continue;
    }
    const bold =
      /^\d+\.\s/.test(line) ||
      /^Subject:/.test(line) ||
      (line === line.toUpperCase() && /[A-Z]/.test(line) && line.length < 48);
    page.drawText(line, {
      x: 48,
      y,
      size: bold ? 12 : 11,
      font: bold ? fontBold : font,
      color: rgb(0.11, 0.1, 0.08),
    });
    y -= bold ? 18 : 15;
  }
  page.drawText("Fictional sample notice for the Campus Brief Agent demo. Not a real institute.", {
    x: 48,
    y: 36,
    size: 9,
    font,
    color: rgb(0.4, 0.34, 0.28),
  });
}

const out = resolve(root, "public/samples/campus-circular.pdf");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, await doc.save());
console.log(`Wrote ${out}`);
