import mongoose, { Schema, Document } from "mongoose";

export interface ITranslation extends Document {
  jobId?: string;
  userId?: string;
  fileName: string;
  fileType: string;
  translatedAt: Date;
  ipAddress?: string;
  pdfData?: Buffer;
}

const TranslationSchema = new Schema<ITranslation>({
  jobId:        { type: String, index: true },
  userId:       { type: String, required: false },
  fileName:     { type: String, required: true },
  fileType:     { type: String, required: true },
  translatedAt: { type: Date, default: Date.now },
  ipAddress:    { type: String },
  pdfData:      { type: Buffer },
});

export default mongoose.models.Translation ||
  mongoose.model<ITranslation>("Translation", TranslationSchema);
