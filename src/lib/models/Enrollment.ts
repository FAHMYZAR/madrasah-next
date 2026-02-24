import mongoose, { Schema, Document, Types } from "mongoose";

export type EnrollmentStatus = "active" | "inactive";

export interface IEnrollment extends Document {
  _id: Types.ObjectId;
  moduleId: Types.ObjectId;
  userId: Types.ObjectId;
  enrolledBy?: Types.ObjectId | string | null;
  enrolledAt: Date;
  status: EnrollmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    moduleId: { type: Schema.Types.ObjectId, ref: "Module", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    enrolledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    enrolledAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

EnrollmentSchema.index({ moduleId: 1, userId: 1 }, { unique: true });

export const Enrollment = mongoose.models.Enrollment || mongoose.model<IEnrollment>("Enrollment", EnrollmentSchema);
