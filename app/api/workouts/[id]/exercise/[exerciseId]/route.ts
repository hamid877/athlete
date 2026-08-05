import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/models/Workout";
import { updateExerciseConfigSchema, reorderExerciseSchema } from "@/validators/workout.schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; exerciseId: string }> }
) {
  try {
    const { id, exerciseId } = await params;

    /* ── Validate path params are valid ObjectIds ── */
    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(exerciseId)
    ) {
      return NextResponse.json(
        { error: "Invalid workout or exercise ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ── Parse & validate request body ── */
    const body = await request.json();
    
    // Check if it's a reorder request
    if (body.direction) {
      const parsed = reorderExerciseSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten() },
          { status: 400 }
        );
      }

      /* ── Fetch workout (ownership check via userId filter) ── */
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

      // Sort by order so we can safely assume adjacent indices correspond to the next/prev items
      workout.exercises.sort((a, b) => a.order - b.order);

      const entryIndex = workout.exercises.findIndex(
        (e) => e.exerciseId.toString() === exerciseId
      );

      if (entryIndex === -1) {
        return NextResponse.json(
          { error: "Exercise not found in this workout" },
          { status: 404 }
        );
      }

      const targetIndex =
        parsed.data.direction === "up" ? entryIndex - 1 : entryIndex + 1;

      // Ensure target index is within bounds
      if (targetIndex >= 0 && targetIndex < workout.exercises.length) {
        // Swap
        const temp = workout.exercises[entryIndex];
        workout.exercises[entryIndex] = workout.exercises[targetIndex];
        workout.exercises[targetIndex] = temp;

        // Reindex
        workout.exercises.forEach((exercise, index) => {
          exercise.order = index;
        });
        
        workout.markModified('exercises');

        await workout.save();
        await workout.populate({
          path: "exercises.exerciseId",
          select: "name equipment primaryMuscle weightInputType",
        });
      }

      return NextResponse.json(workout);
    }

    const parsed = updateExerciseConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    /* ── Fetch workout (ownership check via userId filter) ── */
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

    /* ── Locate the exercise subdocument by its exerciseId field ── */
    const entry = workout.exercises.find(
      (e) => e.exerciseId.toString() === exerciseId
    );

    if (!entry) {
      return NextResponse.json(
        { error: "Exercise not found in this workout" },
        { status: 404 }
      );
    }

    /* ── Apply allowed updates only ── */
    entry.sets = parsed.data.sets;
    entry.repRange.min = parsed.data.repRange.min;
    entry.repRange.max = parsed.data.repRange.max;
    entry.rest = parsed.data.rest;

    await workout.save();

    return NextResponse.json(workout);
  } catch (error) {
    console.error("Error updating exercise configuration:", error);
    return NextResponse.json(
      { error: "Failed to update exercise configuration" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; exerciseId: string }> }
) {
  try {
    const { id, exerciseId } = await params;

    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(exerciseId)
    ) {
      return NextResponse.json(
        { error: "Invalid workout or exercise ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const entryIndex = workout.exercises.findIndex(
      (e) => e.exerciseId.toString() === exerciseId
    );

    if (entryIndex === -1) {
      return NextResponse.json(
        { error: "Exercise not found in this workout" },
        { status: 404 }
      );
    }

    workout.exercises.splice(entryIndex, 1);

    workout.exercises.forEach((exercise, index) => {
      exercise.order = index;
    });

await workout.save();

    await workout.populate({
  path: "exercises.exerciseId",
  select: "name equipment primaryMuscle weightInputType",
});

return NextResponse.json(workout);
  } catch (error) {
    console.error("Error deleting exercise:", error);
    return NextResponse.json(
      { error: "Failed to delete exercise" },
      { status: 500 }
    );
  }
}
