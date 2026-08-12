import { z } from "zod";

const nutritionTargetBase = {
  calories: z.number().int().min(0, "Calories must be positive").max(15000, "Calories cannot exceed 15000"),
  protein: z.number().int().min(0, "Protein must be positive").max(2000, "Protein cannot exceed 2000g"),
  carbs: z.number().int().min(0, "Carbs must be positive").max(2000, "Carbs cannot exceed 2000g"),
  fat: z.number().int().min(0, "Fat must be positive").max(2000, "Fat cannot exceed 2000g"),
};

export const updateNutritionTargetsSchema = z.object({
  ...nutritionTargetBase,
});

export type UpdateNutritionTargetsInput = z.infer<typeof updateNutritionTargetsSchema>;

export const logDailyNutritionSchema = z.object({
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"),
  ...nutritionTargetBase,
});

export type LogDailyNutritionInput = z.infer<typeof logDailyNutritionSchema>;
