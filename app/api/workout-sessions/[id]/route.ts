import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import WorkoutSession from "@/models/WorkoutSession";

const logSetSchema = z.object({
  exerciseIndex: z.number().int().min(0),
  setIndex: z.number().int().min(0),
  weight: z.number().min(0, "Weight must be ≥ 0"),
  reps: z.number().int().min(1, "Reps must be > 0"),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userSession = await auth();
    if (!userSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = logSetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { exerciseIndex, setIndex, weight, reps } = parsed.data;

    await connectDB();

    const workoutSession = await WorkoutSession.findOne({
      _id: id,
      userId: userSession.user.id,
    });

    if (!workoutSession) {
      return NextResponse.json(
        { error: "Workout session not found" },
        { status: 404 }
      );
    }

    const exercise = workoutSession.exercises[exerciseIndex];
    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise index out of range" },
        { status: 400 }
      );
    }

    // Automatically expand the array until the requested index exists
    while (exercise.performedSets.length <= setIndex) {
      exercise.performedSets.push({ weight: 0, reps: 0, completed: false });
    }

    const set = exercise.performedSets[setIndex];

    if (set.completed) {
      return NextResponse.json(
        { error: "Set already completed" },
        { status: 409 }
      );
    }

    exercise.performedSets[setIndex].weight = weight;
    exercise.performedSets[setIndex].reps = reps;
    exercise.performedSets[setIndex].completed = true;

    workoutSession.markModified(`exercises.${exerciseIndex}.performedSets`);

    await workoutSession.save();

    return NextResponse.json(workoutSession, { status: 200 });
  } catch (error) {
    console.error("Log set error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const workoutSession = await WorkoutSession.findOne({
      _id: id,
      userId: session.user.id,
    })
      .populate({
        path: "workoutId",
        select: "name exercises",
      })
      .populate({
        path: "exercises.exerciseId",
        select: "name isCompound primaryMuscle muscleGroup",
      })
      .lean();

    if (!workoutSession) {
      return NextResponse.json(
        { error: "Workout session not found" },
        { status: 404 }
      );
    }

    // Attach plannedRepRange and previousExercise to each exercise
    const enhancedExercises = await Promise.all(
      workoutSession.exercises.map(async (ex: (typeof workoutSession.exercises)[number]) => {
        // 1. Find planned rep range
        const workoutData = workoutSession.workoutId as {
  exercises?: {
    exerciseId: { toString(): string };
    repRange: {
      min: number;
      max: number;
    };
  }[];
};
        const plannedEx = workoutData?.exercises?.find(
          (
  wEx: {
    exerciseId: { toString(): string };
    repRange: {
      min: number;
      max: number;
    };
  }
) =>
            wEx.exerciseId.toString() === ex.exerciseId._id.toString()
        );
        const plannedRepRange = plannedEx?.repRange || { min: 8, max: 12 };

        // 2. Find previous performance
        const prevSession = await WorkoutSession.findOne(
          {
            userId: session.user.id,
            "exercises.exerciseId": ex.exerciseId._id,
            startedAt: { $lt: workoutSession.startedAt },
            status: "completed",
          },
          { "exercises.$": 1, startedAt: 1 }
        )
          .sort({ startedAt: -1 })
          .lean();

        const previousExercise = prevSession?.exercises?.[0] || null;

        return {
          ...ex,
          plannedRepRange,
          previousExercise,
        };
      })
    );

    workoutSession.exercises = enhancedExercises;

    return NextResponse.json(workoutSession);
  } catch (error) {
    console.error("Get workout session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
