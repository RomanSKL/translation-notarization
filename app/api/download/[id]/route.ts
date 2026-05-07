import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Translation from "@/models/Translation";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/download/[id]">) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  await connectDB();
  const translation = await Translation.findOne({ jobId: id });

  if (!translation?.pdfData) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const baseName = translation.fileName.replace(/\.[^/.]+$/, "");

  return new Response(translation.pdfData, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${baseName}_translated_ES.pdf"`,
    },
  });
}
