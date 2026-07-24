import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exercise from "@/models/exercise.model";
import mongoose from "mongoose";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid exercise ID" },
        { status: 400 }
      );
    }

    const exercise = await Exercise.findById(id).lean();

    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("Error fetching exercise:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching the exercise" },
      { status: 500 }
    );
  }
}
