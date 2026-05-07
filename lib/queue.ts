import { Queue } from "bullmq";
import { createRedisConnection } from "./redis";

export const TRANSLATION_QUEUE = "translations";

export interface TranslationJobData {
  userId?: string;
  fileName: string;
  fileType: "pdf" | "docx";
  fileBase64: string;
  ipAddress: string;
}

let queue: Queue | null = null;

export function getTranslationQueue() {
  if (!queue) {
    queue = new Queue(TRANSLATION_QUEUE, {
      connection: createRedisConnection(),
    });
  }
  return queue;
}
