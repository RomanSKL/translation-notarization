import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Translation from "@/models/Translation";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.email;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const translations = await Translation.find({ userId, pdfData: { $exists: true } })
      .select("jobId fileName fileType translatedAt")
      .sort({ translatedAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(translations);
  } catch (err) {
    console.error("History error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
