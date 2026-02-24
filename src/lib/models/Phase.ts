import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPhase extends Document {
  _id: Types.ObjectId;
  moduleId: Types.ObjectId;
  title: string;
  description?: string;
  order: number;
  isPublished: boolean;
  createdBy: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const PhaseSchema = new Schema<IPhase>(
  {
    moduleId: { type: Schema.Types.ObjectId, ref: "Module", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

PhaseSchema.index({ moduleId: 1, order: 1 });

export const Phase = mongoose.models.Phase || mongoose.model<IPhase>("Phase", PhaseSchema);
