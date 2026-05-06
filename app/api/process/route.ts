import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument, rgb, StandardFonts, PDFFont } from "pdf-lib";
import mammoth from "mammoth";
import { extractText } from "unpdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  HeadingLevel,
} from "docx";

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

// ─── PDF ────────────────────────────────────────────────────────────────────

async function processPdf(buffer: Buffer): Promise<Buffer> {
  const extracted = await extractText(new Uint8Array(buffer), { mergePages: true });
  const rawText = Array.isArray(extracted.text) ? extracted.text.join("\n") : (extracted.text as string);

  const doc = await translateStructured(rawText);

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
    const words = text.split(" ");
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
    if (para.trim()) {
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

  return Buffer.from(await pdfDoc.save());
}

// ─── DOCX ───────────────────────────────────────────────────────────────────

async function processDocx(buffer: Buffer): Promise<Buffer> {
  const extracted = await mammoth.extractRawText({ buffer });
  const doc = await translateDocx(extracted.value);

  const date = certDate();
  const cert = certNo();

  const children: Paragraph[] = [];

  // Title
  if (doc.title) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: doc.title, bold: true, size: 28, font: "Times New Roman", color: "111122" })],
      spacing: { after: 160 },
    }));
  }

  // Date
  if (doc.date) {
    children.push(new Paragraph({
      children: [new TextRun({ text: doc.date, size: 24, font: "Times New Roman" })],
      spacing: { after: 200 },
    }));
  }

  // Recipient
  if (doc.recipient) {
    children.push(new Paragraph({
      children: [new TextRun({ text: doc.recipient, size: 24, font: "Times New Roman" })],
      spacing: { after: 200 },
    }));
  }

  // Body
  for (const para of doc.paragraphs) {
    if (para.trim()) {
      children.push(new Paragraph({
        children: [new TextRun({ text: para, size: 24, font: "Times New Roman" })],
        spacing: { after: 200 },
      }));
    }
  }

  // Closing
  if (doc.closing) {
    children.push(new Paragraph({
      children: [new TextRun({ text: doc.closing, size: 24, font: "Times New Roman" })],
      spacing: { before: 200, after: 400 },
    }));
  }

  // Signatory
  if (doc.signatoryName) children.push(new Paragraph({ children: [new TextRun({ text: doc.signatoryName, bold: true, size: 24, font: "Times New Roman" })], spacing: { after: 60 } }));
  if (doc.signatoryTitle) children.push(new Paragraph({ children: [new TextRun({ text: doc.signatoryTitle, size: 22, font: "Times New Roman" })], spacing: { after: 60 } }));
  if (doc.signatoryCompany) children.push(new Paragraph({ children: [new TextRun({ text: doc.signatoryCompany, size: 22, font: "Times New Roman" })], spacing: { after: 60 } }));
  if (doc.signatoryAddress) children.push(new Paragraph({ children: [new TextRun({ text: doc.signatoryAddress, size: 22, font: "Times New Roman" })], spacing: { after: 0 } }));

  // Spacer before stamp
  children.push(new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 600 } }));

  // Signature line
  children.push(new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: "________________________________", color: "8B6914", size: 22 })],
    spacing: { after: 60 },
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: "Maria Gonzalez Herrera", italics: true, size: 22, font: "Times New Roman", color: "1a1a3a" })],
    spacing: { after: 40 },
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: "Traductora Oficial Certificada", size: 16, color: "6b6b8a", font: "Arial" })],
    spacing: { after: 120 },
  }));

  // Stamp table
  const stampTable = new Table({
    alignment: AlignmentType.RIGHT,
    width: { size: 4500, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: "8B6914" },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "8B6914" },
      left: { style: BorderStyle.SINGLE, size: 6, color: "8B6914" },
      right: { style: BorderStyle.SINGLE, size: 6, color: "8B6914" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4500, type: WidthType.DXA },
            shading: { type: ShadingType.SOLID, color: "F8F5EC" },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TRADUCCION CERTIFICADA", bold: true, size: 18, color: "8B6914", font: "Arial" })], spacing: { after: 60 } }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Traduccion Oficial Ingles - Espanol", italics: true, size: 16, color: "4a4a6a", font: "Times New Roman" })], spacing: { after: 80 } }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Fecha: ${date}     Cert. No: ${cert}`, size: 14, color: "4a4a5a", font: "Arial" })], spacing: { after: 60 } }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Certifico que esta traduccion es fiel y completa al documento original en ingles.", italics: true, size: 14, color: "6b6b8a", font: "Times New Roman" })], spacing: { after: 60 } }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Valido para Consulado Espanol  |  NotarizePro", size: 12, color: "8B6914", font: "Arial" })] }),
            ],
          }),
        ],
      }),
    ],
  });

  const document = new Document({
    styles: {
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { size: 28, bold: true, font: { name: "Times New Roman" } } },
      ],
    },
    sections: [{ children: [...children, stampTable] }],
  });

  return await Packer.toBuffer(document);
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

    let resultBuffer: Buffer;
    let contentType: string;

    if (isPdf) {
      resultBuffer = await processPdf(buffer);
      contentType = "application/pdf";
    } else {
      resultBuffer = await processDocx(buffer);
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    return new NextResponse(resultBuffer as unknown as BodyInit, {
      status: 200,
      headers: { "Content-Type": contentType, "Content-Disposition": "attachment" },
    });
  } catch (err) {
    console.error("Process error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
