import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAnswerOption extends Document {
  _id: Types.ObjectId;
  question_id: string;
  option_text: string;
  is_correct: boolean;
}

const AnswerOptionSchema = new Schema<IAnswerOption>(
  {
    question_id: { type: String, required: true },
    option_text: { type: String, required: true },
    is_correct: { type: Boolean, default: false },
  },
  { timestamps: false }
);

export const AnswerOption = mongoose.models.AnswerOption || mongoose.model<IAnswerOption>("AnswerOption", AnswerOptionSchema);
