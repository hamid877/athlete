import { z } from "zod";

export const createWorkoutSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workout name must be at least 2 characters")
    .max(50, "Workout name cannot exceed 50 characters"),

  isRestDay: z.boolean().default(false),
});

export const addExerciseSchema = z.object({
  exerciseId: z.string().min(1, "Exercise ID is required"),
  order: z.number().int().min(0),
  sets: z.number().int().min(1).max(20).default(3),
  repRange: z.object({
    min: z.number().int().min(1).max(100).default(8),
    max: z.number().int().min(1).max(100).default(12),
  }),
  rest: z.number().int().min(0).max(600).default(90),
});

export type AddExerciseInput = z.infer<typeof addExerciseSchema>;

export const updateExerciseConfigSchema = z
  .object({
    sets: z.number().int().min(1, "Minimum 1 set").max(10, "Maximum 10 sets"),
    repRange: z.object({
      min: z
        .number()
        .int()
        .min(1, "Minimum 1 rep")
        .max(50, "Maximum 50 reps"),
      max: z
        .number()
        .int()
        .min(1, "Minimum 1 rep")
        .max(100, "Maximum 100 reps"),
    }),
    rest: z
      .number()
      .int()
      .min(0, "Rest cannot be negative")
      .max(600, "Maximum 600 seconds"),
  })
  .refine((data) => data.repRange.max >= data.repRange.min, {
    message: "Rep max must be ≥ rep min",
    path: ["repRange", "max"],
  });

export type UpdateExerciseConfigInput = z.infer<
  typeof updateExerciseConfigSchema
>;

export const reorderExerciseSchema = z.object({
  direction: z.enum(["up", "down"]),
});

export type ReorderExerciseInput = z.infer<typeof reorderExerciseSchema>;