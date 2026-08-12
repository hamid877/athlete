"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { connectDB } from "@/lib/db";
import { auth, signIn } from "@/lib/auth";
import User from "@/models/User";
import WeightLog from "@/models/weight-log.model";
import Goal from "@/models/goal.model";
import { syncGoal } from "@/lib/goals/sync";
import {
  signUpSchema,
  onboardingSchema,
  type SignUpInput,
  type OnboardingInput,
} from "@/validators/auth.schema";

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function signUp(data: SignUpInput): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  await connectDB();

  const existingUser = await User.findOne({ email: parsed.data.email }).lean();
  if (existingUser) {
    return { success: false, error: "An account with this email already exists" };
  }

  const password = await bcrypt.hash(parsed.data.password, 12);

  await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    password,
    onboardingCompleted: false,
  });

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/onboarding",
  });

  return { success: true };
}

export async function login(
  email: string,
  password: string
): Promise<ActionResult> {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Invalid email or password" };
    }
    throw error;
  }
}

export async function completeOnboarding(
  data: OnboardingInput
): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(data);
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

  user.dateOfBirth = new Date(parsed.data.dateOfBirth);
  user.gender = parsed.data.gender;
  user.heightCm = parsed.data.heightCm;
  user.activityLevel = parsed.data.activityLevel;
  user.experienceLevel = parsed.data.experienceLevel;
  user.unitPreference = parsed.data.unitPreference;
  user.onboardingCompleted = true;
  await user.save();

  await WeightLog.create({
    userId: user._id,
    date: new Date(),
    weightKg: parsed.data.weightKg,
  });

  const goal = await Goal.create({
    userId: user._id,
    type: parsed.data.goalType,
    title: parsed.data.goalTitle,
    targetValue: parsed.data.goalTargetValue,
    currentValue:
      parsed.data.goalType === "weight" ? parsed.data.weightKg : 0,
    unit: parsed.data.goalUnit,
    status: "active",
  });

  await syncGoal(goal);

  redirect("/dashboard");
}
