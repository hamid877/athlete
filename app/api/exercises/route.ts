import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exercise from "@/models/exercise.model";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const muscleGroup = searchParams.get("muscleGroup");
    const primaryMuscle = searchParams.get("primaryMuscle");
    const equipment = searchParams.get("equipment");
    const exerciseType = searchParams.get("exerciseType");
    const difficulty = searchParams.get("difficulty");
    const search = searchParams.get("search");

    const query: Record<string, unknown> = {};

    if (muscleGroup) {
      query.muscleGroup = muscleGroup;
    }
    if (primaryMuscle) {
      query.primaryMuscle = primaryMuscle;
    }
    if (equipment) {
      query.equipment = equipment;
    }
    if (exerciseType) {
      query.exerciseType = exerciseType;
    }
    if (difficulty) {
      query.difficulty = difficulty;
    }
    if (search) {
      // Perform case-insensitive regex search on name
      query.name = { $regex: search, $options: "i" };
    }

    const exercises = await Exercise.find(query).sort({ name: 1 }).lean();

    return NextResponse.json(exercises);
  } catch (error) {
    console.error("Error fetching exercises:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching exercises" },
      { status: 500 }
    );
  }
}
