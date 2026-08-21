import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    refreshTokenVersion: { type: Number, default: 0 }, // bump to invalidate all refresh tokens
    // Password reset (Prompt 07). Only ever store a hash of the token,
    // never the raw value — same principle as passwordHash. A short expiry
    // limits the window a leaked/intercepted link is exploitable.
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User: Model<UserDoc> = model("User", userSchema);
