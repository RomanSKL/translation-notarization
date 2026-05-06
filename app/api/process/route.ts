import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument, rgb, StandardFonts, PDFFont, degrees } from "pdf-lib";
import mammoth from "mammoth";
import { extractText } from "unpdf";
import { connectDB } from "@/lib/mongodb";
import Translation from "@/models/Translation";
import { auth } from "@/auth";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface DocStructure {
  title: string;
  date: string;
  recipient: string;
  paragraphs: string[];
  closing: string;
  signatoryName: string;
  signatoryTitle: string;
  signatoryCompany: string;
  signatoryAddress: string;
}

async function translateStructured(rawText: string): Promise<DocStructure> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8096,
    messages: [
      {
        role: "user",
        content: `Translate the following English document to Spanish and return a JSON object with this exact structure:
{
  "title": "document title (centered heading)",
  "date": "date line",
  "recipient": "salutation / to whom it may concern line",
  "paragraphs": ["paragraph 1", "paragraph 2", ...],
  "closing": "closing word (Sincerely / Atentamente etc)",
  "signatoryName": "signer full name",
  "signatoryTitle": "signer job title",
  "signatoryCompany": "company name",
  "signatoryAddress": "address line"
}

Rules:
- Translate ALL fields to Spanish
- Keep each paragraph as a separate string in the array
- If the source text contains "[PAGE BREAK]", insert it as a separate entry "[PAGE BREAK]" in the paragraphs array at the same relative position
- If a field is not present in the document, use empty string ""
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

async function translateDocx(rawText: string): Promise<DocStructure> {
  return translateStructured(rawText);
}

function certDate(): string {
  return new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
}
function certNo(): string {
  return `NT-${Date.now().toString().slice(-8)}`;
}

// ─── PDF builder ─────────────────────────────────────────────────────────────

async function buildPdf(doc: DocStructure, addPageNumbers = false): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular  = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold     = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic   = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const fontHelv     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const ML = 72; // left margin
  const MR = 72; // right margin
  const MT = 72; // top margin
  const CONTENT_W = PAGE_W - ML - MR;

  // Stamp block height reserved at bottom of last page
  const STAMP_RESERVE = 200;

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MT;

  function newPage() {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MT;
  }

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
    opts: { gap?: number; center?: boolean; color?: [number, number, number]; reserveStamp?: boolean } = {}
  ) {
    if (!text) return;
    const { gap = 6, center = false, color = [0.1, 0.1, 0.15], reserveStamp = false } = opts;
    const lh = size + 4;
    const lines = wrap(text, font, size);
    const needed = lines.length * lh + gap;
    const minY = reserveStamp ? ML + STAMP_RESERVE : ML;
    if (y - needed < minY) newPage();
    for (const line of lines) {
      const xPos = center ? ML + (CONTENT_W - font.widthOfTextAtSize(line, size)) / 2 : ML;
      page.drawText(line, { x: xPos, y, size, font, color: rgb(...color) });
      y -= lh;
    }
    y -= gap;
  }

  function spacer(h: number) { y -= h; }

  // ── Title ──
  if (doc.title) {
    drawWrapped(doc.title, fontBold, 13, { center: true, gap: 4 });
    spacer(6);
  }

  // ── Date ──
  if (doc.date) {
    drawWrapped(doc.date, fontRegular, 11, { gap: 4 });
    spacer(10);
  }

  // ── Recipient ──
  if (doc.recipient) {
    drawWrapped(doc.recipient, fontRegular, 11, { gap: 10 });
  }

  // ── Body paragraphs ──
  for (const para of doc.paragraphs) {
    if (para.trim() === "[PAGE BREAK]") {
      newPage();
    } else if (para.trim()) {
      drawWrapped(para, fontRegular, 11, { gap: 10, reserveStamp: true });
    }
  }

  spacer(10);

  // ── Closing ──
  if (doc.closing) {
    drawWrapped(doc.closing, fontRegular, 11, { gap: 20, reserveStamp: true });
  }

  // ── Signatory block ──
  if (doc.signatoryName) {
    drawWrapped(doc.signatoryName, fontBold, 11, { gap: 2, reserveStamp: true });
  }
  if (doc.signatoryTitle) {
    drawWrapped(doc.signatoryTitle, fontRegular, 11, { gap: 2, reserveStamp: true });
  }
  if (doc.signatoryCompany) {
    drawWrapped(doc.signatoryCompany, fontRegular, 11, { gap: 2, reserveStamp: true });
  }
  if (doc.signatoryAddress) {
    drawWrapped(doc.signatoryAddress, fontRegular, 11, { gap: 2, reserveStamp: true });
  }

  // ── Stamp on last page ──
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();

  const stampW = 240;
  const stampH = 120;
  const stampX = width - stampW - 50;
  const stampY = 45;

  // Signature above stamp
  const sigLineY = stampY + stampH + 22;
  lastPage.drawLine({
    start: { x: stampX + 8, y: sigLineY },
    end: { x: stampX + stampW - 8, y: sigLineY },
    thickness: 0.6,
    color: rgb(0.55, 0.41, 0.08),
  });
  lastPage.drawText("Maria Gonzalez Herrera", {
    x: stampX + 16, y: sigLineY + 5, size: 12, font: fontItalic, color: rgb(0.1, 0.1, 0.25),
  });
  lastPage.drawText("Traductora Oficial Certificada", {
    x: stampX + 16, y: sigLineY - 14, size: 7, font: fontHelv, color: rgb(0.42, 0.42, 0.55),
  });

  // Stamp border outer
  lastPage.drawRectangle({
    x: stampX, y: stampY, width: stampW, height: stampH,
    borderColor: rgb(0.55, 0.41, 0.08), borderWidth: 1.8, color: rgb(0.98, 0.97, 0.94),
  });
  // Stamp border inner
  lastPage.drawRectangle({
    x: stampX + 3, y: stampY + 3, width: stampW - 6, height: stampH - 6,
    borderColor: rgb(0.55, 0.41, 0.08), borderWidth: 0.4, color: rgb(0.98, 0.97, 0.94),
  });

  // Seal circle
  const cx = stampX + 34, cy = stampY + stampH / 2;
  lastPage.drawCircle({ x: cx, y: cy, size: 25, borderColor: rgb(0.55, 0.41, 0.08), borderWidth: 1, color: rgb(0.95, 0.93, 0.88) });
  lastPage.drawCircle({ x: cx, y: cy, size: 18, borderColor: rgb(0.55, 0.41, 0.08), borderWidth: 0.4, color: rgb(0.95, 0.93, 0.88) });
  lastPage.drawText("N", { x: cx - 4, y: cy - 4, size: 11, font: fontBold, color: rgb(0.55, 0.41, 0.08) });

  // Stamp text
  const tx = stampX + 68;
  lastPage.drawText("TRADUCCION CERTIFICADA", { x: tx, y: stampY + stampH - 18, size: 8, font: fontHelvBold, color: rgb(0.55, 0.41, 0.08) });
  lastPage.drawLine({ start: { x: tx, y: stampY + stampH - 23 }, end: { x: stampX + stampW - 8, y: stampY + stampH - 23 }, thickness: 0.4, color: rgb(0.55, 0.41, 0.08) });
  lastPage.drawText("Traduccion Oficial Ingles - Espanol", { x: tx, y: stampY + stampH - 35, size: 7, font: fontRegular, color: rgb(0.3, 0.3, 0.45) });
  lastPage.drawText(`Fecha: ${certDate()}`, { x: tx, y: stampY + stampH - 49, size: 7, font: fontHelv, color: rgb(0.3, 0.3, 0.35) });
  lastPage.drawText(`Cert. No: ${certNo()}`, { x: tx, y: stampY + stampH - 61, size: 7, font: fontHelv, color: rgb(0.3, 0.3, 0.35) });
  lastPage.drawText("Certifico que esta traduccion es fiel y", { x: tx, y: stampY + stampH - 76, size: 6.5, font: fontItalic, color: rgb(0.35, 0.35, 0.5) });
  lastPage.drawText("completa al documento original en ingles.", { x: tx, y: stampY + stampH - 87, size: 6.5, font: fontItalic, color: rgb(0.35, 0.35, 0.5) });
  lastPage.drawText("Valido para Consulado Espanol | NotarizePro", { x: tx, y: stampY + stampH - 101, size: 6, font: fontHelv, color: rgb(0.55, 0.41, 0.08) });

  // Page numbers if original had them
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

  // SAMPLE watermark on every page
  for (const p of pdfDoc.getPages()) {
    const { width: pw, height: ph } = p.getSize();
    p.drawText("SAMPLE", {
      x: pw / 2 - 120,
      y: ph / 2 - 30,
      size: 72,
      font: fontHelvBold,
      color: rgb(0.85, 0.15, 0.15),
      opacity: 0.08,
      rotate: degrees(45),
    });
  }

  return Buffer.from(await pdfDoc.save());
}

// ─── Per-format processors ────────────────────────────────────────────────────

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

async function processPdf(buffer: Buffer): Promise<Buffer> {
  const extracted = await extractText(new Uint8Array(buffer), { mergePages: false });
  const pages = Array.isArray(extracted.text) ? extracted.text : [extracted.text as string];
  let hadPageNumbers = false;
  const cleanedPages = pages.map((p) => {
    const { cleaned, hadNumbers } = stripPageNumbers(p);
    if (hadNumbers) hadPageNumbers = true;
    return cleaned;
  });
  const rawText = cleanedPages.join("\n[PAGE BREAK]\n");
  return buildPdf(await translateStructured(rawText), hadPageNumbers);
}

async function processDocx(buffer: Buffer): Promise<Buffer> {
  const extracted = await mammoth.extractRawText({ buffer });
  return buildPdf(await translateDocx(extracted.value));
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const name = file.name.toLowerCase();
    const isPdf = name.endsWith(".pdf");
    const isDocx = name.endsWith(".docx");
    const isDoc  = name.endsWith(".doc");

    if (!isPdf && !isDocx && !isDoc) {
      return NextResponse.json({ error: "Unsupported file type. Please upload PDF, DOC, or DOCX." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const resultBuffer = isPdf ? await processPdf(buffer) : await processDocx(buffer);

    // Save translation record to MongoDB
    try {
      const session = await auth();
      const userId = session?.user?.id ?? session?.user?.email ?? undefined;
      await connectDB();
      await Translation.create({
        userId,
        fileName: file.name,
        fileType: isPdf ? "pdf" : "docx",
        ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
      });
    } catch (dbErr) {
      console.error("MongoDB save error:", dbErr);
    }

    return new NextResponse(resultBuffer as unknown as BodyInit, {
      status: 200,
      headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment" },
    });
  } catch (err) {
    console.error("Process error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
