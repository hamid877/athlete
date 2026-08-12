import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Meal from "@/models/meal.model";
import { format, subDays } from "date-fns";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const daysParam = parseInt(searchParams.get("days") || "7", 10);
    const days = [7, 14, 30].includes(daysParam) ? daysParam : 7;

    await connectDB();

    const user = await User.findById(session.user.id).select("nutritionTargets").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targets = user.nutritionTargets || { calories: 2500, protein: 150, carbs: 300, fat: 80 };

    // Generate date array for the last `days` days
    const today = new Date();
    const dateStrings: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      dateStrings.push(format(subDays(today, i), "yyyy-MM-dd"));
    }

    const meals = await Meal.find({
      userId: session.user.id,
      dateString: { $in: dateStrings },
    }).lean();

    // Aggregate meals by dateString
    const dailyTotals: Record<string, { calories: number; protein: number }> = {};
    dateStrings.forEach((ds) => {
      dailyTotals[ds] = { calories: 0, protein: 0 };
    });

    meals.forEach((meal) => {
      if (dailyTotals[meal.dateString]) {
        dailyTotals[meal.dateString].calories += meal.calories;
        dailyTotals[meal.dateString].protein += meal.protein;
      }
    });

    const history = dateStrings.map((ds) => {
      // Create a date object to format correctly
      // We parse the string YYYY-MM-DD manually to avoid timezone shift on local client vs server
      const [y, m, d] = ds.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      return {
        dateString: ds,
        formattedDate: format(dateObj, "MMM d"),
        calories: dailyTotals[ds].calories,
        protein: dailyTotals[ds].protein,
        targetCalories: targets.calories,
        targetProtein: targets.protein,
      };
    });

    // Calculate Averages and Adherence
    let totalCalories = 0;
    let totalProtein = 0;
    let daysCalorieTargetMet = 0;
    let daysProteinTargetMet = 0;

    // A day's target is "met" if they are within 10% of it, or simple >= threshold. 
    // Let's use a simpler threshold: if they logged at least 80% of their target.
    // Actually, "adherence" usually means they hit the target. Let's just say >= 90% of target.
    history.forEach((day) => {
      totalCalories += day.calories;
      totalProtein += day.protein;
      
      // Only count days where they actually logged *something*? 
      // If they log nothing, adherence is 0 for that day.
      if (day.calories >= day.targetCalories * 0.9 && day.calories <= day.targetCalories * 1.1) {
        daysCalorieTargetMet++;
      }
      if (day.protein >= day.targetProtein * 0.9) {
        daysProteinTargetMet++;
      }
    });

    const averageCalories = Math.round(totalCalories / days);
    const averageProtein = Math.round(totalProtein / days);
    const calorieAdherence = Math.round((daysCalorieTargetMet / days) * 100);
    const proteinAdherence = Math.round((daysProteinTargetMet / days) * 100);

    return NextResponse.json({
      history,
      averages: {
        calories: averageCalories,
        protein: averageProtein,
      },
      adherence: {
        calories: calorieAdherence,
        protein: proteinAdherence,
      },
    });
  } catch (error) {
    console.error("Error fetching nutrition history:", error);
    return NextResponse.json(
      { error: "Failed to fetch nutrition history" },
      { status: 500 }
    );
  }
}
