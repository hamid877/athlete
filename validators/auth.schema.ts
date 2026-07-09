import { z } from "zod";

export const signUpSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .trim(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),
  password: z.string().min(1, "Password is required"),
});

export const onboardingSchema = z.object({
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"], {
    message: "Please select a gender",
  }),
  heightCm: z
    .number({ message: "Height is required" })
    .min(50, "Height must be at least 50 cm")
    .max(300, "Height must be at most 300 cm"),
  weightKg: z
    .number({ message: "Weight is required" })
    .min(20, "Weight must be at least 20 kg")
    .max(500, "Weight must be at most 500 kg"),
  activityLevel: z.enum(
    ["sedentary", "light", "moderate", "active", "very_active"],
    { message: "Please select an activity level" }
  ),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"], {
    message: "Please select an experience level",
  }),
  unitPreference: z.enum(["metric", "imperial"]).default("metric"),
  goalType: z.enum(["weight", "bodyFat", "strength", "nutrition", "habit"], {
    message: "Please select a goal type",
  }),
  goalTitle: z
    .string()
    .min(2, "Goal title must be at least 2 characters")
    .max(100, "Goal title must be at most 100 characters")
    .trim(),
  goalTargetValue: z
    .number({ message: "Target value is required" })
    .min(0, "Target value must be positive"),
  goalUnit: z.string().min(1, "Unit is required").trim(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const aboutMyselfSchema = z.object({
  age: z
    .number({ message: "Age is required" })
    .min(1, "Age must be at least 1")
    .max(120, "Age must be at most 120"),
  gender: z.enum(["male", "female", "other", "prefer-not-to-say"], {
    message: "Please select an option",
  }),
  heightCm: z
    .number({ message: "Height is required" })
    .min(50, "Height must be at least 50 cm")
    .max(300, "Height must be at most 300 cm"),
  weightKg: z
    .number({ message: "Weight is required" })
    .min(20, "Weight must be at least 20 kg")
    .max(500, "Weight must be at most 500 kg"),
  fitnessGoal: z.string().min(1, "Fitness goal is required"),
  yearsOfLifting: z
    .number({ message: "Years of lifting is required" })
    .min(0, "Years of lifting must be 0 or more")
    .max(100, "Years of lifting must be at most 100"),
  workoutDaysPerWeek: z
    .number({ message: "Workout days per week is required" })
    .min(1, "Must be at least 1 day per week")
    .max(7, "Must be at most 7 days per week"),
  workoutLocation: z.enum(["gym", "home"], {
    message: "Please select a workout location",
  }),
  injuries: z.string().optional(),
  medicalConditions: z.string().optional(),
});

export type AboutMyselfInput = z.infer<typeof aboutMyselfSchema>;

