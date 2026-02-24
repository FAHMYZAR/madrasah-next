import mongoose, { Schema, Document, Types } from "mongoose";

export type Visibility = "public" | "private";
export type EnrollmentType = "manual" | "enroll_key" | "open";

export interface IModule extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  description: string;
  createdBy: Types.ObjectId | string;
  assignedTeacherId?: Types.ObjectId | string | null;
  isActive: boolean;
  visibility: Visibility;
  enrollmentType: EnrollmentType;
  enrollKey?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ModuleSchema = new Schema<IModule>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTeacherId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isActive: { type: Boolean, default: true },
    visibility: { type: String, enum: ["public", "private"], default: "private" },
    enrollmentType: { type: String, enum: ["manual", "enroll_key", "open"], default: "manual" },
    enrollKey: { type: String, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { timestamps: true }
);

ModuleSchema.pre("validate", function (next) {
  if (!this.code) {
    this.code = `MOD-${Date.now()}`;
  }
  if (typeof next === "function") next();
});

export const Module = mongoose.models.Module || mongoose.model<IModule>("Module", ModuleSchema);
