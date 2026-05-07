import { config } from "dotenv";
config({ path: ".env.local" });
import { Worker, Job } from "bullmq";
import { createRedisConnection } from "./lib/redis";
import { connectDB } from "./lib/mongodb";
import Translation from "./models/Translation";
import { processPdf, processDocx } from "./lib/processor";
import { TRANSLATION_QUEUE, type TranslationJobData } from "./lib/queue";

async function processJob(job: Job<TranslationJobData>) {
  console.log(`[worker] Processing job ${job.id}: ${job.data.fileName}`);

  const buffer = Buffer.from(job.data.fileBase64, "base64");
  const resultBuffer = job.data.fileType === "pdf"
    ? await processPdf(buffer)
    : await processDocx(buffer);

  await connectDB();
  await Translation.create({
    jobId: job.id,
    userId: job.data.userId,
    fileName: job.data.fileName,
    fileType: job.data.fileType,
    ipAddress: job.data.ipAddress,
    pdfData: resultBuffer,
  });

  console.log(`[worker] Job ${job.id} complete`);
  return { success: true };
}

const worker = new Worker(TRANSLATION_QUEUE, processJob, {
  connection: createRedisConnection(),
  concurrency: 2,
});

worker.on("completed", (job) => console.log(`[worker] ✓ ${job.id}`));
worker.on("failed", (job, err) => console.error(`[worker] ✗ ${job?.id}:`, err.message));

console.log("[worker] Listening for translation jobs...");
