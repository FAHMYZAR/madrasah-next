import mongoose, { Schema, Document, Types } from "mongoose";

export type QuizStatus = "draft" | "published" | "active" | "archived";

export interface IQuiz extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  module_id: string;
  status: QuizStatus;
  duration_minutes: number;
  pass_score: number;
  max_attempts: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  show_correct_answer_after_submit: boolean;
  start_at?: Date | null;
  end_at?: Date | null;
  created_by: string;
  createdAt: Date;
}

const QuizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    module_id: { type: String, required: true },
    status: { type: String, enum: ["draft", "published", "active", "archived"], default: "draft" },
    duration_minutes: { type: Number, default: 30, min: 1, max: 300 },
    pass_score: { type: Number, default: 70, min: 1, max: 100 },
    max_attempts: { type: Number, default: 1, min: 1, max: 20 },
    randomize_questions: { type: Boolean, default: false },
    randomize_options: { type: Boolean, default: false },
    show_correct_answer_after_submit: { type: Boolean, default: false },
    start_at: { type: Date, default: null },
    end_at: { type: Date, default: null },
    created_by: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Quiz = mongoose.models.Quiz || mongoose.model<IQuiz>("Quiz", QuizSchema);
