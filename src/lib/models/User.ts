import mongoose, { Schema, Document, Types } from "mongoose";

export type UserRole = "admin" | "guru" | "user";

export interface IUser extends Document {
  _id: Types.ObjectId;
  nim: string; // unique student/teacher id
  name: string;
  className?: string;
  role: UserRole;
  isActive: boolean;
  password: string; // hashed
  email?: string;
  profile_url?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    nim: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    className: { type: String, default: "" },
    role: { type: String, enum: ["admin", "guru", "user"], default: "user" },
    isActive: { type: Boolean, default: true },
    password: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    profile_url: { type: String },
  },
  { timestamps: true }
);

UserSchema.index({ nim: 1 }, { unique: true });

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
