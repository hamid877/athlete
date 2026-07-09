"use server";

import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import User from "@/models/User";
import WeightLog from "@/models/weight-log.model";
import { aboutMyselfSchema, type AboutMyselfInput } from "@/validators/auth.schema";

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function completeAboutMyself(
  data: AboutMyselfInput
): Promise<ActionResult> {
  const parsed = aboutMyselfSchema.safeParse(data);
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

  // Auto-calculate experience level from years of lifting
  const years = parsed.data.yearsOfLifting;
  const experienceLevel =
    years < 1 ? "beginner" : years < 5 ? "intermediate" : "advanced";

  // Update user fields
  user.age = parsed.data.age;
  user.gender = parsed.data.gender;
  user.heightCm = parsed.data.heightCm;
  user.weightKg = parsed.data.weightKg;
  user.fitnessGoal = parsed.data.fitnessGoal;
  user.yearsOfLifting = parsed.data.yearsOfLifting;
  user.workoutDaysPerWeek = parsed.data.workoutDaysPerWeek;
  user.workoutLocation = parsed.data.workoutLocation;
  user.injuries = parsed.data.injuries || "";
  user.medicalConditions = parsed.data.medicalConditions || "";
  user.experienceLevel = experienceLevel;
  user.profileCompleted = true;

  await user.save();

  // Create a weight log entry
  await WeightLog.create({
    userId: user._id,
    date: new Date(),
    weightKg: parsed.data.weightKg,
    note: "Initial onboarding weight",
  });

  redirect("/dashboard");
}
