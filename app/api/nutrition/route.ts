import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Meal from "@/models/meal.model";

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

    await connectDB();

    // Fetch user targets and today's meals in parallel
    const [user, meals] = await Promise.all([
      User.findById(session.user.id).select("nutritionTargets").lean(),
      Meal.find({
        userId: session.user.id,
        dateString,
      }).sort({ createdAt: 1 }).lean(),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      targets: user.nutritionTargets || null,
      meals: meals || [],
    });
  } catch (error) {
    console.error("Error fetching nutrition data:", error);
    return NextResponse.json(
      { error: "Failed to fetch nutrition data" },
      { status: 500 }
    );
  }
}
