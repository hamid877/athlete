import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import DailyNutrition from "@/models/daily-nutrition.model";
import { logDailyNutritionSchema } from "@/validators/nutrition.schema";
import { z } from "zod";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateString = searchParams.get("date");

    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return NextResponse.json(
        { error: "Valid dateString (YYYY-MM-DD) is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Fetch user targets and today's record in parallel
    const [user, dailyRecord] = await Promise.all([
      User.findById(session.user.id).select("nutritionTargets").lean(),
      DailyNutrition.findOne({
        userId: session.user.id,
        dateString,
      }).lean(),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      targets: user.nutritionTargets || null,
      dailyRecord: dailyRecord || null,
    });
  } catch (error) {
    console.error("Error fetching nutrition data:", error);
    return NextResponse.json(
      { error: "Failed to fetch nutrition data" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = logDailyNutritionSchema.parse(body);

    await dbConnect();

    const updatedRecord = await DailyNutrition.findOneAndUpdate(
      { userId: session.user.id, dateString: validatedData.dateString },
      {
        $set: {
          calories: validatedData.calories,
          protein: validatedData.protein,
          carbs: validatedData.carbs,
          fat: validatedData.fat,
        },
      },
      { new: true, upsert: true }
    );

    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error("Error logging daily nutrition:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to log daily nutrition" },
      { status: 500 }
    );
  }
}
