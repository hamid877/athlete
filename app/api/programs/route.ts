import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import TrainingProgram from "@/models/TrainingProgram";
import Workout from "@/models/Workout";
import { createProgramSchema } from "@/validators/program.schema";
import type { Types } from "mongoose";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

/** Workout name sequences for each split type, cycling through active days. */
const WORKOUT_NAMES_BY_SPLIT: Record<string, string[]> = {
  bro_split: ["Chest", "Back", "Legs", "Shoulders", "Arms"],
  push_pull_legs: ["Push", "Pull", "Legs", "Push", "Pull"],
  upper_lower: ["Upper", "Lower", "Upper", "Lower"],
  full_body: ["Full Body A", "Full Body B", "Full Body C"],
  arnold: [
    "Chest & Back",
    "Shoulders & Arms",
    "Legs",
    "Chest & Back",
    "Shoulders & Arms",
    "Legs",
  ],
  custom: [],
};

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
    type RawWorkoutDay = { day: DayOfWeek; workoutId: null; isRestDay: boolean };
    let rawDays: RawWorkoutDay[] = [];

    switch (splitType) {
      case "custom":
        rawDays = DAYS_OF_WEEK.map((day) => ({
          day,
          workoutId: null,
          isRestDay: false,
        }));
        break;
      case "push_pull_legs":
        // Push, Pull, Legs, Rest, Push, Pull, Rest
        rawDays = DAYS_OF_WEEK.map((day, index) => ({
          day,
          workoutId: null,
          isRestDay: index === 3 || index === 6,
        }));
        break;
      case "bro_split":
        // 5 days on, 2 days off (Mon-Fri active, Sat-Sun rest)
        rawDays = DAYS_OF_WEEK.map((day, index) => ({
          day,
          workoutId: null,
          isRestDay: index >= 5,
        }));
        break;
      case "upper_lower":
        // Upper, Lower, Rest, Upper, Lower, Rest, Rest
        rawDays = DAYS_OF_WEEK.map((day, index) => ({
          day,
          workoutId: null,
          isRestDay: index === 2 || index === 5 || index === 6,
        }));
        break;
      case "full_body":
        // Full Body A/B/C on Mon, Wed, Fri; rest on other days
        rawDays = DAYS_OF_WEEK.map((day, index) => ({
          day,
          workoutId: null,
          isRestDay: index % 2 !== 0 || index === 6,
        }));
        break;
      case "arnold":
        // Chest/Back, Shoulders/Arms, Legs, Rest, Chest/Back, Shoulders/Arms, Legs
        rawDays = DAYS_OF_WEEK.map((day, index) => ({
          day,
          workoutId: null,
          isRestDay: index === 3,
        }));
        break;
      default:
        // Default to all active if somehow not matched
        rawDays = DAYS_OF_WEEK.map((day) => ({
          day,
          workoutId: null,
          isRestDay: false,
        }));
    }

    // Create Workout documents for every non-rest day and assign their _ids
    const nameSequence = WORKOUT_NAMES_BY_SPLIT[splitType] ?? [];
    let nameIndex = 0;

    type EnrichedWorkoutDay = {
      day: DayOfWeek;
      workoutId: Types.ObjectId | null;
      isRestDay: boolean;
    };

    const workoutDays: EnrichedWorkoutDay[] = [];

    for (const wd of rawDays) {
      if (wd.isRestDay) {
        workoutDays.push({ day: wd.day, workoutId: null, isRestDay: true });
        continue;
      }

      // Pick a name: cycle through the sequence, or fall back to the day name for custom
      const workoutName =
        nameSequence.length > 0
          ? nameSequence[nameIndex % nameSequence.length]
          : wd.day;
      nameIndex++;

      const workout = await Workout.create({
        userId: session.user.id,
        name: workoutName,
        day: wd.day,
        isRestDay: false,
      });

      workoutDays.push({
        day: wd.day,
        workoutId: workout._id as Types.ObjectId,
        isRestDay: false,
      });
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
