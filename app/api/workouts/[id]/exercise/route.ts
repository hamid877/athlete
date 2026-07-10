import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/models/Workout";
import { addExerciseSchema } from "@/validators/workout.schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDB();

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const parsed = addExerciseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const workout = await Workout.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!workout) {
      return NextResponse.json(
        { error: "Workout not found" },
        { status: 404 }
      );
    }

    workout.exercises.push({
      exerciseId: new mongoose.Types.ObjectId(parsed.data.exerciseId),
      order: parsed.data.order,
      sets: parsed.data.sets,
      repRange: parsed.data.repRange,
      rest: parsed.data.rest,
    });

    await workout.save();

    return NextResponse.json(workout, { status: 201 });
  } catch (error) {
    console.error("Error adding exercise to workout:", error);
    return NextResponse.json(
      { error: "Failed to add exercise" },
      { status: 500 }
    );
  }
}
