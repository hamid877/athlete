import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/models/Workout";
import { createWorkoutSchema } from "@/validators/workout.schema";



export async function GET() {
  try {
    await connectDB();

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const workouts = await Workout.find({
      userId: session.user.id,
    }).sort({ day: 1 });

    return NextResponse.json(workouts);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch workouts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

const parsed = createWorkoutSchema.safeParse(body);

if (!parsed.success) {
  return NextResponse.json(
    {
      error: parsed.error.flatten(),
    },
    {
      status: 400,
    }
  );
}
const workout = await Workout.create({
  userId: session.user.id,
  name: parsed.data.name,
  isRestDay: parsed.data.isRestDay,
  exercises: [],
});

    return NextResponse.json(workout, {
      status: 201,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to create workout",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await connectDB();

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Workout ID is required" },
        { status: 400 }
      );
    }

    const deletedWorkout = await Workout.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!deletedWorkout) {
      return NextResponse.json(
        { error: "Workout not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Workout deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete workout" },
      { status: 500 }
    );
  }
}