import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument, rgb, StandardFonts, PDFFont, degrees } from "pdf-lib";

export type ElementType =
  | "title"
  | "heading"
  | "subheading"
  | "paragraph"
  | "date"
  | "recipient"
  | "closing"
  | "signature_name"
  | "signature_line"
  | "page_break";

export interface DocElement {
  type: ElementType;
  text?: string;
}

export interface DocStructure {
  runningHeader: string;
  elements: DocElement[];
}

export async function translateStructured(rawText: string): Promise<DocStructure> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8096,
    messages: [
      {
        role: "user",
        content: `Translate the following English document to Spanish. Return a JSON object with this structure:

{
  "runningHeader": "text shown at top of every page, or empty string",
  "elements": [
    { "type": "title",          "text": "main centered title" },
    { "type": "date",           "text": "date line" },
    { "type": "recipient",      "text": "To Whom It May Concern / Dear..." },
    { "type": "heading",        "text": "1. SECTION HEADING" },
    { "type": "subheading",     "text": "1.1 Sub-section" },
    { "type": "paragraph",      "text": "body paragraph text" },
    { "type": "closing",        "text": "Sincerely," },
    { "type": "signature_name", "text": "John Smith" },
    { "type": "signature_line", "text": "Senior Engineer" },
    { "type": "page_break" }
  ]
}

Element type rules:
- "title": the main centered document title (first page only, do NOT repeat in elements)
- "heading": numbered or named section headings (e.g. "1. TERM", "ARTICLE II", "WHEREAS:")
- "subheading": sub-sections within a heading (e.g. "1.1", "a)", "(i)")
- "paragraph": regular body text paragraphs
- "date": standalone date line
- "recipient": salutation or "To Whom It May Concern"
- "closing": closing word/phrase (Sincerely, Atentamente, etc.)
- "signature_name": the signer's name (bold)
- "signature_line": signer's title, company, address (one per line)
- "page_break": insert where "[PAGE BREAK]" appears in the source

Additional rules:
- Translate ALL text to Spanish
- If source contains "[RUNNING HEADER: ...]", translate it and put in "runningHeader"
- If source contains "[PAGE BREAK]", add { "type": "page_break" } at that position
- Preserve document structure exactly — same number of headings, paragraphs, sections
- Do NOT merge separate paragraphs into one
- Do NOT skip any content
- Return ONLY valid JSON, no markdown, no explanation

Document:
${rawText}`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response from Claude");

  const jsonText = block.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(jsonText) as DocStructure;
}

function certDate(): string {
  return new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
}
function certNo(): string {
  return `NT-${Date.now().toString().slice(-8)}`;
}

export async function buildPdf(doc: DocStructure, addPageNumbers = false): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular  = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold     = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic   = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const fontHelv     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const ML = 72;
  const MR = 72;
  const MT = 72;
  const CONTENT_W = PAGE_W - ML - MR;
  const STAMP_RESERVE = 200;

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MT;

  function drawRunningHeader() {
    if (!doc.runningHeader) return;
    const rhY = PAGE_H - 36;
    page.drawText(doc.runningHeader, { x: ML, y: rhY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawLine({ start: { x: ML, y: rhY - 6 }, end: { x: PAGE_W - MR, y: rhY - 6 }, thickness: 0.5, color: rgb(0.2, 0.2, 0.2) });
  }

  function newPage() {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MT;
    drawRunningHeader();
  }

  drawRunningHeader();

  function wrap(text: string, font: PDFFont, size: number): string[] {
    const words = text.replace(/[\r\n]+/g, " ").split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > CONTENT_W) {
        if (cur) lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }

  function drawWrapped(
    text: string,
    font: PDFFont,
    size: number,
    opts: { gap?: number; center?: boolean; color?: [number, number, number]; reserveStamp?: boolean; spaceBefore?: number } = {}
  ) {
    if (!text?.trim()) return;
    const { gap = 6, center = false, color = [0.1, 0.1, 0.15], reserveStamp = false, spaceBefore = 0 } = opts;
    const lh = size + 4;
    const lines = wrap(text, font, size);
    const needed = spaceBefore + lines.length * lh + gap;
    const minY = reserveStamp ? ML + STAMP_RESERVE : ML;
    if (y - needed < minY) newPage();
    y -= spaceBefore;
    for (const line of lines) {
      const xPos = center ? ML + (CONTENT_W - font.widthOfTextAtSize(line, size)) / 2 : ML;
      page.drawText(line, { x: xPos, y, size, font, color: rgb(...color) });
      y -= lh;
    }
    y -= gap;
  }

  for (const el of doc.elements) {
    switch (el.type) {
      case "title":
        drawWrapped(el.text!, fontBold, 14, { center: true, gap: 6, spaceBefore: 8 });
        break;
      case "date":
        drawWrapped(el.text!, fontRegular, 11, { gap: 4, spaceBefore: 10 });
        break;
      case "recipient":
        drawWrapped(el.text!, fontRegular, 11, { gap: 12 });
        break;
      case "heading":
        drawWrapped(el.text!, fontBold, 11, { gap: 4, spaceBefore: 14, reserveStamp: true });
        break;
      case "subheading":
        drawWrapped(el.text!, fontBoldItalic, 10, { gap: 4, spaceBefore: 8, reserveStamp: true });
        break;
      case "paragraph":
        drawWrapped(el.text!, fontRegular, 11, { gap: 10, reserveStamp: true });
        break;
      case "closing":
        drawWrapped(el.text!, fontRegular, 11, { gap: 20, spaceBefore: 16, reserveStamp: true });
        break;
      case "signature_name":
        drawWrapped(el.text!, fontBold, 11, { gap: 2, reserveStamp: true });
        break;
      case "signature_line":
        drawWrapped(el.text!, fontRegular, 11, { gap: 2, reserveStamp: true });
        break;
      case "page_break":
        newPage();
        break;
    }
  }

  // ── Stamp on last page ──
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();

  const stampW = 240, stampH = 120;
  const stampX = width - stampW - 50;
  const stampY = 45;
  const sigLineY = stampY + stampH + 22;

  lastPage.drawLine({ start: { x: stampX + 8, y: sigLineY }, end: { x: stampX + stampW - 8, y: sigLineY }, thickness: 0.6, color: rgb(0.55, 0.41, 0.08) });
  lastPage.drawText("Maria Gonzalez Herrera", { x: stampX + 16, y: sigLineY + 5, size: 12, font: fontItalic, color: rgb(0.1, 0.1, 0.25) });
  lastPage.drawText("Traductora Oficial Certificada", { x: stampX + 16, y: sigLineY - 14, size: 7, font: fontHelv, color: rgb(0.42, 0.42, 0.55) });

  lastPage.drawRectangle({ x: stampX, y: stampY, width: stampW, height: stampH, borderColor: rgb(0.55, 0.41, 0.08), borderWidth: 1.8, color: rgb(0.98, 0.97, 0.94) });
  lastPage.drawRectangle({ x: stampX + 3, y: stampY + 3, width: stampW - 6, height: stampH - 6, borderColor: rgb(0.55, 0.41, 0.08), borderWidth: 0.4, color: rgb(0.98, 0.97, 0.94) });

  const cx = stampX + 34, cy = stampY + stampH / 2;
  lastPage.drawCircle({ x: cx, y: cy, size: 25, borderColor: rgb(0.55, 0.41, 0.08), borderWidth: 1, color: rgb(0.95, 0.93, 0.88) });
  lastPage.drawCircle({ x: cx, y: cy, size: 18, borderColor: rgb(0.55, 0.41, 0.08), borderWidth: 0.4, color: rgb(0.95, 0.93, 0.88) });
  lastPage.drawText("N", { x: cx - 4, y: cy - 4, size: 11, font: fontBold, color: rgb(0.55, 0.41, 0.08) });

  const tx = stampX + 68;
  lastPage.drawText("TRADUCCION CERTIFICADA", { x: tx, y: stampY + stampH - 18, size: 8, font: fontHelvBold, color: rgb(0.55, 0.41, 0.08) });
  lastPage.drawLine({ start: { x: tx, y: stampY + stampH - 23 }, end: { x: stampX + stampW - 8, y: stampY + stampH - 23 }, thickness: 0.4, color: rgb(0.55, 0.41, 0.08) });
  lastPage.drawText("Traduccion Oficial Ingles - Espanol", { x: tx, y: stampY + stampH - 35, size: 7, font: fontRegular, color: rgb(0.3, 0.3, 0.45) });
  lastPage.drawText(`Fecha: ${certDate()}`, { x: tx, y: stampY + stampH - 49, size: 7, font: fontHelv, color: rgb(0.3, 0.3, 0.35) });
  lastPage.drawText(`Cert. No: ${certNo()}`, { x: tx, y: stampY + stampH - 61, size: 7, font: fontHelv, color: rgb(0.3, 0.3, 0.35) });
  lastPage.drawText("Certifico que esta traduccion es fiel y", { x: tx, y: stampY + stampH - 76, size: 6.5, font: fontItalic, color: rgb(0.35, 0.35, 0.5) });
  lastPage.drawText("completa al documento original en ingles.", { x: tx, y: stampY + stampH - 87, size: 6.5, font: fontItalic, color: rgb(0.35, 0.35, 0.5) });
  lastPage.drawText("Valido para Consulado Espanol | NotarizePro", { x: tx, y: stampY + stampH - 101, size: 6, font: fontHelv, color: rgb(0.55, 0.41, 0.08) });

  if (addPageNumbers) {
    const allPages = pdfDoc.getPages();
    const total = allPages.length;
    for (let i = 0; i < allPages.length; i++) {
      const p = allPages[i];
      const { width: pw } = p.getSize();
      const label = `${i + 1} / ${total}`;
      const lw = fontHelv.widthOfTextAtSize(label, 8);
      p.drawText(label, { x: (pw - lw) / 2, y: 28, size: 8, font: fontHelv, color: rgb(0.5, 0.5, 0.5) });
    }
  }

  for (const p of pdfDoc.getPages()) {
    const { width: pw, height: ph } = p.getSize();
    p.drawText("SAMPLE", { x: pw / 2 - 120, y: ph / 2 - 30, size: 72, font: fontHelvBold, color: rgb(0.85, 0.15, 0.15), opacity: 0.08, rotate: degrees(45) });
  }

  return Buffer.from(await pdfDoc.save());
}

function stripRunningHeaders(pages: string[]): { pages: string[]; runningHeaders: string[] } {
  if (pages.length < 2) return { pages, runningHeaders: [] };

  const firstLines = pages.map((p) => {
    const line = p.trim().split("\n").find((l) => l.trim()) ?? "";
    return line.trim();
  });

  const counts = new Map<string, number>();
  for (const line of firstLines) {
    if (line) counts.set(line, (counts.get(line) ?? 0) + 1);
  }

  const headers = new Set(
    [...counts.entries()].filter(([, c]) => c >= 2).map(([l]) => l)
  );

  if (headers.size === 0) return { pages, runningHeaders: [] };

  return {
    pages: pages.map((page) =>
      page.split("\n").filter((line) => !headers.has(line.trim())).join("\n")
    ),
    runningHeaders: [...headers],
  };
}

function stripPageNumbers(text: string): { cleaned: string; hadNumbers: boolean } {
  const lines = text.split("\n");
  let hadNumbers = false;
  const cleaned = lines.filter((line) => {
    const t = line.trim();
    if (/^\s*page\s+\d+\s+(of\s+\d+)?\s*$/i.test(t) || /^\s*\d+\s*(\/\s*\d+)?\s*$/.test(t)) {
      hadNumbers = true;
      return false;
    }
    return true;
  }).join("\n");
  return { cleaned, hadNumbers };
}

export async function processPdf(buffer: Buffer): Promise<Buffer> {
  const { extractText } = await import("unpdf");
  const extracted = await extractText(new Uint8Array(buffer), { mergePages: false });
  const pages = Array.isArray(extracted.text) ? extracted.text : [extracted.text as string];

  let hadPageNumbers = false;
  const cleanedPages = pages.map((p) => {
    const { cleaned, hadNumbers } = stripPageNumbers(p);
    if (hadNumbers) hadPageNumbers = true;
    return cleaned;
  });

  const { pages: noHeaders, runningHeaders } = stripRunningHeaders(cleanedPages);
  const prefix = runningHeaders.length > 0 ? `[RUNNING HEADER: ${runningHeaders.join(" | ")}]\n\n` : "";
  const rawText = prefix + noHeaders.join("\n[PAGE BREAK]\n");
  return buildPdf(await translateStructured(rawText), hadPageNumbers);
}

export async function processDocx(buffer: Buffer): Promise<Buffer> {
  const mammoth = await import("mammoth");
  const extracted = await mammoth.extractRawText({ buffer });
  return buildPdf(await translateStructured(extracted.value));
}
