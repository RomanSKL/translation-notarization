import { NextRequest } from "next/server";
import { Job } from "bullmq";
import { getTranslationQueue } from "@/lib/queue";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/job/[id]">) {
  const { id } = await ctx.params;

  const queue = getTranslationQueue();
  const job = await Job.fromId(queue, id);

  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const state = await job.getState();

  return Response.json({
    jobId: id,
    status: state,
    failedReason: state === "failed" ? job.failedReason : undefined,
  });
}
