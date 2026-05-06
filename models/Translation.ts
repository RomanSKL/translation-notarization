import mongoose, { Schema, Document } from "mongoose";

export interface ITranslation extends Document {
  userId: string;
  fileName: string;
  fileType: string;
  translatedAt: Date;
  ipAddress?: string;
}

const TranslationSchema = new Schema<ITranslation>({
  userId:       { type: String, required: false },
  fileName:     { type: String, required: true },
  fileType:     { type: String, required: true },
  translatedAt: { type: Date, default: Date.now },
  ipAddress:    { type: String },
});

export default mongoose.models.Translation ||
  mongoose.model<ITranslation>("Translation", TranslationSchema);
