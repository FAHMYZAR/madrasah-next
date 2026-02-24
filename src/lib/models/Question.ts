import mongoose, { Schema, Document, Types } from "mongoose";

export type QuestionType = "multiple_choice" | "essay";

export interface IQuestion extends Document {
  _id: Types.ObjectId;
  quiz_id: string;
  type: QuestionType;
  question_text: string;
  explanation?: string;
  points: number;
  order: number;
  answer_key_text?: string;
  manual_grading_required: boolean;
  createdAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    quiz_id: { type: String, required: true },
    type: { type: String, enum: ["multiple_choice", "essay"], default: "multiple_choice" },
    question_text: { type: String, required: true, trim: true },
    explanation: { type: String, default: "" },
    points: { type: Number, default: 10, min: 1, max: 100 },
    order: { type: Number, default: 0 },
    answer_key_text: { type: String, default: "" },
    manual_grading_required: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Question = mongoose.models.Question || mongoose.model<IQuestion>("Question", QuestionSchema);
