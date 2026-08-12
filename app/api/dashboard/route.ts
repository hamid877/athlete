import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import TrainingProgram from "@/models/TrainingProgram";
import WorkoutSession from "@/models/WorkoutSession";
import Workout from "@/models/Workout";
import { getUserTimezone, getLocalCalendarDate } from "@/lib/date-utils";

export async function GET(request: Request) {
  try {
    await connectDB();
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Total Programs
    const totalPrograms = await TrainingProgram.countDocuments({ userId });

    // 2. Completed Sessions
    const completedSessionsCount = await WorkoutSession.countDocuments({
      userId,
      status: "completed",
    });

    // 3. Weekly Workouts (Start of week: Monday)
    const now = getLocalCalendarDate(new Date(), getUserTimezone(request));
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 = Monday, 6 = Sunday
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - dayOfWeek);

    // If active program has activatedAt, use the later of Monday OR activatedAt
    const activeProgram = await TrainingProgram.findOne({
      userId,
      isActive: true,
    }).lean();

    let actualStartOfWeek = startOfWeek;
    if (activeProgram?.activatedAt) {
      if (activeProgram.activatedAt > startOfWeek) {
        actualStartOfWeek = activeProgram.activatedAt;
      }
    }

    const weeklyWorkouts = await WorkoutSession.countDocuments({
      userId,
      status: "completed",
      finishedAt: { $gte: actualStartOfWeek },
    });

    // 4. Current Streak & Total Exercises Logged
    // Fetch all completed sessions sorted by finishedAt desc
    const completedSessions = await WorkoutSession.find({
      userId,
      status: "completed",
    }).sort({ finishedAt: -1 }).lean();

    let currentStreak = 0;
    let totalExercisesLogged = 0;

    const uniqueDates = new Set<string>();

    completedSessions.forEach((sess: { exercises?: unknown[], finishedAt?: Date }) => {
      // Add up exercises
      if (sess.exercises) {
        totalExercisesLogged += sess.exercises.length;
      }
      
      if (sess.finishedAt) {
        // Just the date part YYYY-MM-DD
        uniqueDates.add(new Date(sess.finishedAt).toISOString().split('T')[0]);
      }
    });

    const datesArray = Array.from(uniqueDates).sort((a, b) => (a < b ? 1 : -1)); // descending
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let checkDate = new Date();
    if (datesArray.length > 0) {
      if (datesArray[0] === todayStr || datesArray[0] === yesterdayStr) {
        // Streak is alive
        checkDate = new Date(datesArray[0]);
        for (const dateStr of datesArray) {
          const dStr = checkDate.toISOString().split('T')[0];
          if (dateStr === dStr) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    // 5. Last Workout
    const lastWorkoutSession = completedSessions.length > 0 ? completedSessions[0] : null;
 let lastWorkout = null;

if (lastWorkoutSession) {
  const workout = await Workout.findById(lastWorkoutSession.workoutId).lean();

  lastWorkout = {
    name: workout?.name || "Workout",
    duration: lastWorkoutSession.duration,
    finishedAt: lastWorkoutSession.finishedAt
      ? lastWorkoutSession.finishedAt.toISOString()
      : undefined,
  };
}

    // 6. Active Session
    const activeSessionDoc = await WorkoutSession.findOne({
      userId,
      status: "in_progress",
    }).sort({ startedAt: -1 }).lean();
    
    let activeSession = null;
    if (activeSessionDoc) {
      const workout = await Workout.findById(activeSessionDoc.workoutId).lean();
      activeSession = {
        ...activeSessionDoc,
        workoutName: workout?.name || "Workout",
      };
    }

    // 7. Today's Workout
    let todayWorkout = null;

    if (activeProgram) {
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const todayName = dayNames[now.getDay()];
      
      const todayDay = activeProgram.workoutDays.find(
        (d: { day: string; isRestDay: boolean; workoutId?: string }) => d.day === todayName
      );

      if (todayDay && !todayDay.isRestDay && todayDay.workoutId) {
        const workout = await Workout.findById(todayDay.workoutId).lean();
if (workout) {
  todayWorkout = {
    _id: workout._id.toString(),
    name: workout.name,
    isRestDay: workout.isRestDay,
    exercises: workout.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId.toString(),
    })),
  };
}
      }
    }

    let isTodayWorkoutCompleted = false;
    if (todayWorkout) {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      isTodayWorkoutCompleted = completedSessions.some(
        (sess) =>
          sess.workoutId.toString() === todayWorkout._id &&
          sess.finishedAt &&
          new Date(sess.finishedAt) >= todayStart
      );
    }

    return NextResponse.json({
      user: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
      stats: {
        totalPrograms,
        completedSessions: completedSessionsCount,
        currentStreak,
        weeklyWorkouts,
        weeklyGoal: 5,
        totalExercisesLogged,
      },
      lastWorkout,
      todayWorkout,
      isTodayWorkoutCompleted,
      activeSession,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
