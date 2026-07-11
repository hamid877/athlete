import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/models/Workout";
import WorkoutSession from "@/models/WorkoutSession";

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

    const exercises = workout.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      order: exercise.order,
      performedSets: [],
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
