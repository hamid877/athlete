import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import TrainingProgram from "@/models/TrainingProgram";
import { createProgramSchema } from "@/validators/program.schema";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export async function POST(request: Request) {
  try {
    await connectDB();

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createProgramSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, splitType } = parsed.data;

    // Deactivate currently active program for the user
    await TrainingProgram.updateMany(
      { userId: session.user.id, isActive: true },
      { $set: { isActive: false } }
    );

    // Generate workout days based on split type
    let workoutDays: Array<{
      day: typeof DAYS_OF_WEEK[number];
      workoutId: null;
      isRestDay: boolean;
    }> = [];

    switch (splitType) {
      case "custom":
        workoutDays = DAYS_OF_WEEK.map((day) => ({
          day,
          workoutId: null,
          isRestDay: false,
        }));
        break;
      case "push_pull_legs":
        // Push, Pull, Legs, Rest, Push, Pull, Rest
        workoutDays = DAYS_OF_WEEK.map((day, index) => ({
          day,
          workoutId: null,
          isRestDay: index === 3 || index === 6,
        }));
        break;
      case "bro_split":
        // 5 days on, 2 days off (Mon-Fri active, Sat-Sun rest)
        workoutDays = DAYS_OF_WEEK.map((day, index) => ({
          day,
          workoutId: null,
          isRestDay: index >= 5,
        }));
        break;
      case "upper_lower":
        // Upper, Lower, Rest, Upper, Lower, Rest, Rest
        workoutDays = DAYS_OF_WEEK.map((day, index) => ({
          day,
          workoutId: null,
          isRestDay: index === 2 || index === 5 || index === 6,
        }));
        break;
      case "full_body":
        // Full, Rest, Full, Rest, Full, Rest, Rest
        workoutDays = DAYS_OF_WEEK.map((day, index) => ({
          day,
          workoutId: null,
          isRestDay: index % 2 !== 0 || index === 6,
        }));
        break;
      case "arnold":
        // Chest/Back, Shoulders/Arms, Legs, Rest, Chest/Back, Shoulders/Arms, Legs
        workoutDays = DAYS_OF_WEEK.map((day, index) => ({
          day,
          workoutId: null,
          isRestDay: index === 3,
        }));
        break;
      default:
        // Default to all active if somehow not matched
        workoutDays = DAYS_OF_WEEK.map((day) => ({
          day,
          workoutId: null,
          isRestDay: false,
        }));
    }

    const program = await TrainingProgram.create({
      userId: session.user.id,
      name,
      splitType,
      isActive: true,
      workoutDays,
    });

    return NextResponse.json(program, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create program" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const programs = await TrainingProgram.find({ userId: session.user.id }).sort({
      createdAt: -1,
    });

    return NextResponse.json(programs);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch programs" },
      { status: 500 }
    );
  }
}
