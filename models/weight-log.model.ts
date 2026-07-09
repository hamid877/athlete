import mongoose, { Schema, type Model } from "mongoose";
import type { WeightLogDocument } from "@/types";

const weightLogSchema = new Schema<WeightLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: Date, required: true },
    weightKg: { type: Number, required: true },
    note: { type: String },
  },
  { timestamps: true }
);

weightLogSchema.index({ userId: 1, date: -1 });

const WeightLog: Model<WeightLogDocument> =
  mongoose.models.WeightLog ??
  mongoose.model<WeightLogDocument>("WeightLog", weightLogSchema);

export default WeightLog;
