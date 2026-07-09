import mongoose, { Schema, type Model } from "mongoose";
import type { GoalDocument } from "@/types";

const goalSchema = new Schema<GoalDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["weight", "bodyFat", "strength", "nutrition", "habit"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    targetValue: { type: Number, required: true },
    currentValue: { type: Number, default: 0 },
    unit: { type: String, required: true },
    targetDate: { type: Date },
    status: {
      type: String,
      enum: ["active", "achieved", "abandoned"],
      default: "active",
    },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, status: 1 });

const Goal: Model<GoalDocument> =
  mongoose.models.Goal ??
  mongoose.model<GoalDocument>("Goal", goalSchema);

export default Goal;
