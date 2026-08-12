import mongoose, { Schema, type Model } from "mongoose";
import type { DailyNutritionDocument } from "@/types";

const dailyNutritionSchema = new Schema<DailyNutritionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dateString: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Please fill a valid date in YYYY-MM-DD format"],
    },
    calories: { type: Number, required: true, default: 0, min: 0 },
    protein: { type: Number, required: true, default: 0, min: 0 },
    carbs: { type: Number, required: true, default: 0, min: 0 },
    fat: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true, collection: "daily_nutrition" }
);

dailyNutritionSchema.index({ userId: 1, dateString: 1 }, { unique: true });

const DailyNutrition: Model<DailyNutritionDocument> =
  mongoose.models.DailyNutrition ??
  mongoose.model<DailyNutritionDocument>("DailyNutrition", dailyNutritionSchema);

export default DailyNutrition;
