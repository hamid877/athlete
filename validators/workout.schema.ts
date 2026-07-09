import { z } from "zod";

export const createWorkoutSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workout name must be at least 2 characters")
    .max(50, "Workout name cannot exceed 50 characters"),

  isRestDay: z.boolean().default(false),
});