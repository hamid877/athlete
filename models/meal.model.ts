import mongoose, { Schema, type Model } from "mongoose";
import type { MealDocument } from "@/types";

const mealSchema = new Schema<MealDocument>(
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
    name: { type: String, required: true, trim: true, maxlength: 100 },
    calories: { type: Number, required: true, default: 0, min: 0 },
    protein: { type: Number, required: true, default: 0, min: 0 },
    carbs: { type: Number, required: true, default: 0, min: 0 },
    fat: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true, collection: "meals" }
);

// Non-unique index because there can be multiple meals per user per day
mealSchema.index({ userId: 1, dateString: 1 });

const Meal: Model<MealDocument> =
  mongoose.models.Meal ?? mongoose.model<MealDocument>("Meal", mealSchema);

export default Meal;
