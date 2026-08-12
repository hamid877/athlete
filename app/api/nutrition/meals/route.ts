import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Meal from "@/models/meal.model";
import { mealSchema } from "@/validators/nutrition.schema";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = mealSchema.parse(body);

    await connectDB();

    const newMeal = await Meal.create({
      userId: session.user.id,
      ...validatedData,
    });

    return NextResponse.json(newMeal, { status: 201 });
  } catch (error) {
    console.error("Error creating meal:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create meal" },
      { status: 500 }
    );
  }
}
