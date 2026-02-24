import mongoose, { Schema, Document, Types } from "mongoose";

export type MaterialType = "pdf" | "video" | "link";

export interface IMaterial extends Document {
  _id: Types.ObjectId;
  phaseId: Types.ObjectId;
  type: MaterialType;
  title: string;
  url: string;
  description?: string;
  order: number;
  isVisible: boolean;
  createdBy: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema = new Schema<IMaterial>(
  {
    phaseId: { type: Schema.Types.ObjectId, ref: "Phase", required: true },
    type: { type: String, enum: ["pdf", "video", "link"], required: true },
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

MaterialSchema.index({ phaseId: 1, order: 1 });

export const Material = mongoose.models.Material || mongoose.model<IMaterial>("Material", MaterialSchema);
