import { z } from "zod";

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
  muscle_growth: z.enum(["cm", "in"]),
  consistency: z.enum(["workouts/week", "days/week"]),
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
  });

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
