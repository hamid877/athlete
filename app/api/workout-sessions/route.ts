import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/models/Workout";
import WorkoutSession from "@/models/WorkoutSession";
import TrainingProgram from "@/models/TrainingProgram";

const createWorkoutSessionSchema = z.object({
  workoutId: z.string().min(1, "Workout ID is required"),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = createWorkoutSessionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: result.error.format() },
        { status: 400 }
      );
    }

    const { workoutId } = result.data;

    await connectDB();

    const workout = await Workout.findOne({
      _id: workoutId,
      userId: session.user.id,
    });

    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    // --- First Workout Restriction ---
    const activeProgram = await TrainingProgram.findOne({
      userId: session.user.id,
      isActive: true,
    }).lean();

    if (activeProgram && activeProgram.activatedAt) {
      const sessionCount = await WorkoutSession.countDocuments({
        userId: session.user.id,
        startedAt: { $gte: activeProgram.activatedAt },
      });

      if (sessionCount === 0) {
        // This is the FIRST session since the program was activated.
        const userTimezone = req.headers.get("x-timezone") || "UTC";
        
        let currentLocalWeekday = "";
        try {
          const formatter = new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            timeZone: userTimezone,
          });
          currentLocalWeekday = formatter.format(new Date());
        } catch (e) {
          console.warn("Invalid timezone provided, falling back to UTC.", e);
          currentLocalWeekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date());
        }

        const requestedWorkoutDay = activeProgram.workoutDays.find(
          (wd: { day: string; workoutId?: { toString(): string } | null }) => wd.workoutId?.toString() === workoutId
        );

        if (requestedWorkoutDay && requestedWorkoutDay.day !== currentLocalWeekday) {
          return NextResponse.json(
            { error: `New programs must begin with today's scheduled workout (${currentLocalWeekday}).` },
            { status: 400 }
          );
        }
      }
    }
    // ---------------------------------

    const exercises = workout.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      order: exercise.order,
      performedSets: Array.from({ length: exercise.sets }, () => ({
        weight: 0,
        reps: 0,
        completed: false,
      })),
    }));

    const workoutSession = await WorkoutSession.create({
      userId: session.user.id,
      workoutId: workout._id,
      startedAt: new Date(),
      status: "in_progress",
      exercises,
    });

    return NextResponse.json(workoutSession, { status: 201 });
  } catch (error) {
    console.error("Create workout session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    await connectDB();

    const query: Record<string, string> = { userId: session.user.id };
    if (status) {
      query.status = status;
    }

    const workoutSessions = await WorkoutSession.find(query)
      .sort({ finishedAt: -1, startedAt: -1 })
      .populate({
        path: "workoutId",
        select: "name",
      })
      .populate({
        path: "exercises.exerciseId",
        select: "name weightInputType",
      })
      .lean();

    return NextResponse.json(workoutSessions);
  } catch (error) {
    console.error("Get workout sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

