import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/models/Workout";
import "@/models/exercise.model"; // Register Exercise model for populate
import { ExerciseConfigurationForm } from "@/components/workouts/ExerciseConfigurationForm";

/* ─── Types ──────────────────────────────────────────────────────── */

interface PopulatedExercise {
  _id: string;
  name: string;
}

interface PopulatedEntry {
  exerciseId: PopulatedExercise | null;
  sets: number;
  repRange: { min: number; max: number };
  rest: number;
}

interface WorkoutLean {
  _id: string;
  name: string;
  exercises: PopulatedEntry[];
}

/* ─── Page ───────────────────────────────────────────────────────── */

interface Props {
  params: Promise<{ id: string; exerciseId: string }>;
}

export default async function ConfigureExercisePage({ params }: Props) {
  const { id, exerciseId } = await params;

  await connectDB();

  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const raw = await Workout.findOne({
    _id: id,
    userId: session.user.id,
  })
    .populate({ path: "exercises.exerciseId", select: "name" })
    .lean();

  if (!raw) {
    notFound();
  }

  const workout = raw as unknown as WorkoutLean;

  /* Find the entry whose exerciseId._id matches the route param */
  const entry = workout.exercises.find(
    (e) => e.exerciseId?._id?.toString() === exerciseId
  );

  if (!entry || !entry.exerciseId) {
    notFound();
  }

  return (
    <div className="flex flex-col">
      {/* ─── Header ─── */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/workouts/${id}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--background-subtle)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
          aria-label="Back to workout"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>

        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Edit Exercise
          </h1>
          <p className="truncate text-sm text-[var(--text-secondary)]">
            {workout.name}
          </p>
        </div>
      </div>

      {/* ─── Form ─── */}
      <ExerciseConfigurationForm
        workoutId={id}
        exerciseId={exerciseId}
        exerciseName={entry.exerciseId.name}
        defaultValues={{
          sets: entry.sets,
          repRange: { min: entry.repRange.min, max: entry.repRange.max },
          rest: entry.rest,
        }}
      />
    </div>
  );
}
