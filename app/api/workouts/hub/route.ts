/**
 * GET /api/workouts/hub
 *
 * Purpose-built endpoint for the Workout Hub page.
 * Queries workout/program domain models only — zero Dashboard coupling.
 *
 * All six queries run in parallel via Promise.all.
 * Volume is pre-computed server-side so the client receives
 * numeric totals instead of raw exercise arrays.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import TrainingProgram from "@/models/TrainingProgram";
import WorkoutSession from "@/models/WorkoutSession";
import Workout from "@/models/Workout";
import User from "@/models/User";
import { calculateSetVolume } from "@/lib/performance/volume";
import type { WeightInputType } from "@/types";
import { getUserTimezone, getLocalCalendarDate } from "@/lib/date-utils";

/* ── Internal lean types ───────────────────────────────────── */

interface LeanPerformedSet {
  weight: number;
  reps: number;
  completed: boolean;
}

interface LeanSessionExercise {
  exerciseId:
    | { _id: { toString(): string }; weightInputType?: string }
    | { toString(): string };
  performedSets: LeanPerformedSet[];
}

interface LeanWorkoutSession {
  _id: { toString(): string };
  workoutId:
    | { _id: { toString(): string }; name: string }
    | { toString(): string }
    | null;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  status: string;
  exercises: LeanSessionExercise[];
}

interface LeanWorkoutDay {
  day: string;
  isRestDay: boolean;
  workoutId:
    | { _id: { toString(): string }; name: string; exercises: unknown[] }
    | null;
}

/* ── Volume helper ─────────────────────────────────────────── */

function computeSessionVolume(exercises: LeanSessionExercise[]): number {
  let total = 0;
  for (const ex of exercises) {
    const weightInputType: string | undefined =
      typeof ex.exerciseId === "object" &&
      ex.exerciseId !== null &&
      "weightInputType" in ex.exerciseId
        ? (ex.exerciseId as { weightInputType?: string }).weightInputType
        : undefined;

    for (const set of ex.performedSets) {
      if (set.completed && set.reps > 0) {
        total += calculateSetVolume(
          set.weight,
          set.reps,
          weightInputType as WeightInputType | undefined,
        );
      }
    }
  }
  return Math.round(total);
}

/* ── Response types (exported for client use) ──────────────── */

export interface ActiveSessionInfo {
  _id: string;
  workoutId: string;
  workoutName: string;
  startedAt: string;
}

export interface TodayWorkoutInfo {
  _id: string;
  name: string;
  exerciseCount: number;
  isRestDay: boolean;
}

export interface ActiveProgramInfo {
  _id: string;
  name: string;
  splitType?: string;
  workoutDays: {
    day: string;
    workoutId: string | null;
    workoutName: string | null;
    isRestDay: boolean;
  }[];
}

export interface ThisWeekInfo {
  completedCount: number;
  weeklyGoal: number;
  totalVolume: number;
  currentStreak: number;
}

export interface RecentSessionInfo {
  _id: string;
  workoutName: string;
  finishedAt: string;
  duration?: number;
  totalVolume: number;
}

export interface WorkoutHubAPIResponse {
  activeSession: ActiveSessionInfo | null;
  todayWorkout: TodayWorkoutInfo | null;
  isTodayWorkoutCompleted: boolean;
  isRestDay: boolean;
  hasActiveProgram: boolean;
  activeProgram: ActiveProgramInfo | null;
  thisWeek: ThisWeekInfo;
  recentSessions: RecentSessionInfo[];
}

/* ── Streak helper ─────────────────────────────────────────── */

function computeStreak(sessions: { finishedAt?: Date }[]): number {
  const uniqueDates = new Set<string>();
  for (const s of sessions) {
    if (s.finishedAt) {
      uniqueDates.add(new Date(s.finishedAt).toISOString().split("T")[0]);
    }
  }
  const dates = Array.from(uniqueDates).sort((a, b) => (a < b ? 1 : -1));
  if (dates.length === 0) return 0;

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) return 0;

  let streak = 0;
  const check = new Date(dates[0]);
  for (const d of dates) {
    if (d === check.toISOString().split("T")[0]) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/* ── Route handler ── */

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await connectDB();
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    /* ── Week boundary (Monday-based) ── */
    const now = getLocalCalendarDate(new Date(), getUserTimezone(request));
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - dayOfWeek);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    /* ── Parallel DB queries ── */
    const [
      activeSessionDoc,
      activeProgramDoc,
    ] = await Promise.all([
      WorkoutSession.findOne({ userId, status: "in_progress" })
        .sort({ startedAt: -1 })
        .lean() as Promise<LeanWorkoutSession | null>,

      TrainingProgram.findOne({ userId, isActive: true })
        .populate({
          path: "workoutDays.workoutId",
          select: "name exercises",
        })
        .lean(),
    ]);

    let actualStartOfWeek = startOfWeek;
    const activeProgramData = activeProgramDoc as { activatedAt?: Date } | null;
    if (activeProgramData?.activatedAt) {
      if (activeProgramData.activatedAt > startOfWeek) {
        actualStartOfWeek = activeProgramData.activatedAt;
      }
    }

    const [
      weekSessions,
      recentDocs,
      allCompletedDocs,
      userDoc,
    ] = await Promise.all([
      WorkoutSession.find({
        userId,
        status: "completed",
        finishedAt: { $gte: actualStartOfWeek },
      })
        .select("finishedAt exercises")
        .populate({ path: "exercises.exerciseId", select: "weightInputType" })
        .lean() as Promise<LeanWorkoutSession[]>,

      WorkoutSession.find({ userId, status: "completed" })
        .sort({ finishedAt: -1 })
        .limit(5)
        .populate({ path: "workoutId", select: "name" })
        .populate({ path: "exercises.exerciseId", select: "weightInputType" })
        .lean() as Promise<LeanWorkoutSession[]>,

      WorkoutSession.find({ userId, status: "completed" })
        .select("finishedAt workoutId")
        .sort({ finishedAt: -1 })
        .lean() as Promise<{ finishedAt?: Date; workoutId: { toString(): string } }[]>,

      User.findById(userId).select("workoutDaysPerWeek").lean(),
    ]);

    /* ── Active session ── */
    let activeSession: ActiveSessionInfo | null = null;
    if (activeSessionDoc) {
      let workoutName = "Workout";
      if (activeSessionDoc.workoutId) {
        if (
          typeof activeSessionDoc.workoutId === "object" &&
          "name" in activeSessionDoc.workoutId
        ) {
          workoutName = (activeSessionDoc.workoutId as { name: string }).name;
        } else {
          const w = await Workout.findById(activeSessionDoc.workoutId)
            .select("name")
            .lean();
          if (w) workoutName = (w as { name: string }).name;
        }
      }
      activeSession = {
        _id: activeSessionDoc._id.toString(),
        workoutId:
          typeof activeSessionDoc.workoutId === "object" &&
          activeSessionDoc.workoutId !== null &&
          "_id" in activeSessionDoc.workoutId
            ? (activeSessionDoc.workoutId as { _id: { toString(): string } })._id.toString()
            : activeSessionDoc.workoutId?.toString() ?? "",
        workoutName,
        startedAt: activeSessionDoc.startedAt.toISOString(),
      };
    }

    /* ── Active program + today's workout ── */
    let activeProgram: ActiveProgramInfo | null = null;
    let todayWorkout: TodayWorkoutInfo | null = null;
    let isRestDay = false;

    if (activeProgramDoc) {
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

      const rawDays = (
        activeProgramDoc.workoutDays as unknown as LeanWorkoutDay[]
      );

      const programWorkoutDays = rawDays.map((wd) => {
        const populated =
          wd.workoutId &&
          typeof wd.workoutId === "object" &&
          "name" in wd.workoutId
            ? (wd.workoutId as { _id: { toString(): string }; name: string; exercises: unknown[] })
            : null;

        return {
          day: wd.day,
          isRestDay: wd.isRestDay,
          workoutId: populated ? populated._id.toString() : null,
          workoutName: populated ? populated.name : null,
        };
      });

      activeProgram = {
        _id: (activeProgramDoc._id as { toString(): string }).toString(),
        name: activeProgramDoc.name as string,
        splitType: activeProgramDoc.splitType as string | undefined,
        workoutDays: programWorkoutDays,
      };

      const todayDay = rawDays.find((wd) => wd.day === todayName);
      if (todayDay) {
        if (todayDay.isRestDay) {
          isRestDay = true;
        } else if (
          todayDay.workoutId &&
          typeof todayDay.workoutId === "object" &&
          "name" in todayDay.workoutId
        ) {
          const tw = todayDay.workoutId as {
            _id: { toString(): string };
            name: string;
            exercises: unknown[];
          };
          todayWorkout = {
            _id: tw._id.toString(),
            name: tw.name,
            exerciseCount: tw.exercises.length,
            isRestDay: false,
          };
        }
      }
    }

    /* ── isTodayWorkoutCompleted ── */
    const isTodayWorkoutCompleted = todayWorkout
      ? allCompletedDocs.some(
          (s) =>
            s.workoutId?.toString() === todayWorkout!._id &&
            s.finishedAt &&
            new Date(s.finishedAt) >= todayStart,
        )
      : false;

    /* ── This week stats ── */
    let weeklyVolume = 0;
    for (const s of weekSessions) {
      weeklyVolume += computeSessionVolume(s.exercises);
    }

    const weeklyGoal =
      (userDoc as { workoutDaysPerWeek?: number } | null)?.workoutDaysPerWeek ?? 5;

    const currentStreak = computeStreak(allCompletedDocs as { finishedAt?: Date }[]);

    const thisWeek: ThisWeekInfo = {
      completedCount: weekSessions.length,
      weeklyGoal,
      totalVolume: weeklyVolume,
      currentStreak,
    };

    /* ── Recent sessions ── */
    const recentSessions: RecentSessionInfo[] = recentDocs.map((s) => {
      const workoutName =
        s.workoutId &&
        typeof s.workoutId === "object" &&
        "name" in s.workoutId
          ? (s.workoutId as { name: string }).name
          : "Workout";

      return {
        _id: s._id.toString(),
        workoutName,
        finishedAt: s.finishedAt ? new Date(s.finishedAt).toISOString() : new Date().toISOString(),
        duration: s.duration,
        totalVolume: computeSessionVolume(s.exercises),
      };
    });

    const body: WorkoutHubAPIResponse = {
      activeSession,
      todayWorkout,
      isTodayWorkoutCompleted,
      isRestDay,
      hasActiveProgram: activeProgram !== null,
      activeProgram,
      thisWeek,
      recentSessions,
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/workouts/hub error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
