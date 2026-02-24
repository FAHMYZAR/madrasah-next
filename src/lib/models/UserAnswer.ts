import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUserAnswer extends Document {
  _id: Types.ObjectId;
  attempt_id: string;
  question_id: string;
  selected_option_id: string;
  answer_text?: string;
  is_correct: boolean;
  awarded_points: number;
  review_status: "pending" | "auto_graded" | "manual_graded";
  graded_by?: string;
  graded_at?: Date;
}

const UserAnswerSchema = new Schema<IUserAnswer>(
  {
    attempt_id: { type: String, required: true },
    question_id: { type: String, required: true },
    selected_option_id: { type: String, required: true, default: "" },
    answer_text: { type: String, default: "" },
    is_correct: { type: Boolean, default: false },
    awarded_points: { type: Number, default: 0 },
    review_status: { type: String, enum: ["pending", "auto_graded", "manual_graded"], default: "auto_graded" },
  },
  { timestamps: false }
);

export const UserAnswer = mongoose.models.UserAnswer || mongoose.model<IUserAnswer>("UserAnswer", UserAnswerSchema);
