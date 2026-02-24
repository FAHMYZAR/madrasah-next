import mongoose, { Schema, Document, Types } from "mongoose";

export type AttemptStatus = "in_progress" | "submitted" | "graded";

export interface IQuizAttempt extends Document {
  _id: Types.ObjectId;
  user_id: string;
  quiz_id: string;
  started_at: Date;
  submitted_at?: Date;
  total_score?: number;
  status: AttemptStatus;
}

const QuizAttemptSchema = new Schema<IQuizAttempt>(
  {
    user_id: { type: String, required: true },
    quiz_id: { type: String, required: true },
    started_at: { type: Date, default: Date.now },
    submitted_at: { type: Date },
    total_score: { type: Number },
    status: { type: String, enum: ["in_progress", "submitted", "graded"], default: "in_progress" },
  },
  { timestamps: false }
);

export const QuizAttempt = mongoose.models.QuizAttempt || mongoose.model<IQuizAttempt>("QuizAttempt", QuizAttemptSchema);
