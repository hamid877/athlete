import { z } from "zod";
import { SUPPORTED_MUSCLES } from "@/lib/growth-intelligence/muscle-analysis.service";

const GoalTypeEnum = z.enum([
  "weight",
  "bodyFat",
  "strength",
  "nutrition",
  "habit",
  "muscle_growth",
  "consistency",
]);

const baseGoalSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Goal title must be at least 2 characters")
    .max(100, "Goal title cannot exceed 100 characters"),
  targetValue: z.number().min(0, "Target value must be positive"),
  currentValue: z.number().min(0, "Current value must be positive").default(0),
  startDate: z.coerce.date().default(() => new Date()),
  targetDate: z.coerce.date().optional(),
});

const unitMapping = {
  weight: z.enum(["kg", "lbs"]),
  bodyFat: z.enum(["%"]),
  strength: z.enum(["kg", "lbs"]),
  nutrition: z.enum(["kcal", "g"]),
  habit: z.enum(["days/week", "times/week"]),
  muscle_growth: z.enum(["score"]),
  consistency: z.enum(["workouts", "workouts/week", "days/week"]),
};

export const createGoalSchema = z
  .object({
    type: GoalTypeEnum,
    title: baseGoalSchema.shape.title,
    targetValue: baseGoalSchema.shape.targetValue,
    currentValue: baseGoalSchema.shape.currentValue,
    startDate: baseGoalSchema.shape.startDate,
    targetDate: baseGoalSchema.shape.targetDate,
    unit: z.string(),
    exerciseId: z.string().optional(),
    muscle: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const allowedUnitsSchema = unitMapping[data.type as keyof typeof unitMapping];
    if (allowedUnitsSchema) {
      const parsed = allowedUnitsSchema.safeParse(data.unit);
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid unit for goal type ${data.type}. Expected one of: ${allowedUnitsSchema.options.join(", ")}`,
          path: ["unit"],
        });
      }
    }
    if (data.type === "strength" && !data.exerciseId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "exerciseId is required for strength goals",
        path: ["exerciseId"],
      });
    }

    if (data.type === "muscle_growth") {
      if (!data.muscle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "muscle is required for muscle_growth goals",
          path: ["muscle"],
        });
      } else if (!SUPPORTED_MUSCLES.includes(data.muscle)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid muscle. Expected one of: ${SUPPORTED_MUSCLES.join(", ")}`,
          path: ["muscle"],
        });
      }
    }
  });

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = createGoalSchema
  .partial()
  .extend({
    status: z.enum(["active", "achieved", "archived"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type && data.unit) {
      const allowedUnitsSchema = unitMapping[data.type as keyof typeof unitMapping];
      if (allowedUnitsSchema) {
        const parsed = allowedUnitsSchema.safeParse(data.unit);
        if (!parsed.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid unit for goal type ${data.type}. Expected one of: ${allowedUnitsSchema.options.join(", ")}`,
            path: ["unit"],
          });
        }
      }
    }

    if (data.type === "strength" && data.exerciseId === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "exerciseId is required for strength goals",
        path: ["exerciseId"],
      });
    }

    if (data.type === "muscle_growth" && data.muscle !== undefined) {
      if (!SUPPORTED_MUSCLES.includes(data.muscle)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid muscle. Expected one of: ${SUPPORTED_MUSCLES.join(", ")}`,
          path: ["muscle"],
        });
      }
    }
  });

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
