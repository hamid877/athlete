import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/models/Workout";
import { ExercisePicker } from "@/components/workouts/ExercisePicker";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AddExercisePage({ params }: Props) {
  const { id } = await params;

  await connectDB();

  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const workout = await Workout.findOne({
    _id: id,
    userId: session.user.id,
  })
    .select("name exercises")
    .lean();

  if (!workout) {
    notFound();
  }

  const exerciseCount = Array.isArray(workout.exercises)
    ? workout.exercises.length
    : 0;

  return (
    <div className="flex flex-col">
      {/* ─── Header ─── */}
      <div className="mb-5 flex items-center gap-3">
        <Link
          href={`/workouts/${id}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--background-subtle)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
          aria-label="Back to workout"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>

        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Add Exercise
          </h1>
          <p className="truncate text-sm text-[var(--text-secondary)]">
            {workout.name}
          </p>
        </div>
      </div>

      {/* ─── Picker ─── */}
      <ExercisePicker workoutId={id} exerciseCount={exerciseCount} workoutName={workout.name} />
    </div>
  );
}
