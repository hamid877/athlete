"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { z } from "zod";

const updateProfileSchema = z.object({
  age: z
    .number({ message: "Age is required" })
    .min(1, "Age must be at least 1")
    .max(120, "Age must be at most 120")
    .optional(),
  gender: z
    .enum(["male", "female", "other", "prefer-not-to-say"])
    .optional(),
  heightCm: z
    .number({ message: "Height is required" })
    .min(50, "Height must be at least 50 cm")
    .max(300, "Height must be at most 300 cm")
    .optional(),
  weightKg: z
    .number({ message: "Weight is required" })
    .min(20, "Weight must be at least 20 kg")
    .max(500, "Weight must be at most 500 kg")
    .optional(),
  fitnessGoal: z.string().min(1, "Fitness goal is required").optional(),
  yearsOfLifting: z
    .number()
    .min(0, "Must be 0 or more")
    .max(100)
    .optional(),
  workoutDaysPerWeek: z
    .number()
    .min(1, "Must be at least 1")
    .max(7, "Must be at most 7")
    .optional(),
  workoutLocation: z.enum(["gym", "home"]).optional(),
  injuries: z.string().optional(),
  medicalConditions: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function updateProfile(
  data: UpdateProfileInput
): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  await connectDB();

  const user = await User.findById(session.user.id);
  if (!user) {
    return { success: false, error: "User not found" };
  }

  // Update only provided fields
  const d = parsed.data;
  if (d.age !== undefined) user.age = d.age;
  if (d.gender !== undefined) user.gender = d.gender;
  if (d.heightCm !== undefined) user.heightCm = d.heightCm;
  if (d.weightKg !== undefined) user.weightKg = d.weightKg;
  if (d.fitnessGoal !== undefined) user.fitnessGoal = d.fitnessGoal;
  if (d.yearsOfLifting !== undefined) {
    user.yearsOfLifting = d.yearsOfLifting;
    // Recalculate experience level
    user.experienceLevel =
      d.yearsOfLifting < 1
        ? "beginner"
        : d.yearsOfLifting < 5
          ? "intermediate"
          : "advanced";
  }
  if (d.workoutDaysPerWeek !== undefined)
    user.workoutDaysPerWeek = d.workoutDaysPerWeek;
  if (d.workoutLocation !== undefined) user.workoutLocation = d.workoutLocation;
  if (d.injuries !== undefined) user.injuries = d.injuries;
  if (d.medicalConditions !== undefined)
    user.medicalConditions = d.medicalConditions;

  await user.save();

  revalidatePath("/dashboard");

  return { success: true };
}
