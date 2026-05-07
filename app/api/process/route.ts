import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTranslationQueue } from "@/lib/queue";

export const maxDuration = 10;

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

    const session = await auth();
    const userId = session?.user?.id ?? session?.user?.email ?? undefined;

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileBase64 = buffer.toString("base64");

    const queue = getTranslationQueue();
    const job = await queue.add("translate", {
      userId,
      fileName: file.name,
      fileType: isPdf ? "pdf" : "docx",
      fileBase64,
      ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
    });

    return NextResponse.json({ jobId: job.id });
  } catch (err) {
    console.error("Process error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
