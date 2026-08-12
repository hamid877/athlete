"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dumbbell, Calendar, ChevronRight, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/* ─── Types ─────────────────────────────────────────────────── */

interface WorkoutDay {
  day: string;
  workoutId: string;
  workoutName: string;
  exerciseCount: number;
}

/* ─── Skeleton card ─────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 rounded-md bg-[var(--background-subtle)]" />
        <div className="h-5 w-16 rounded-md bg-[var(--background-subtle)]" />
      </div>
      <div className="h-4 w-20 rounded-md bg-[var(--background-subtle)]" />
      <div className="h-9 w-full rounded-xl bg-[var(--background-subtle)]" />
    </div>
  );
}

/* ─── Workout card ──────────────────────────────────────────── */

interface WorkoutCardProps {
  day: WorkoutDay;
  onStart: (workoutId: string) => Promise<void>;
  starting: string | null;
  isDisabled: boolean;
  isRecommended: boolean;
}

function WorkoutCard({ day, onStart, starting, isDisabled, isRecommended }: WorkoutCardProps) {
  const isStarting = starting === day.workoutId;

  return (
    <Card className={`flex flex-col gap-4 p-5 transition-shadow ${isRecommended ? 'border-[var(--primary)] ring-1 ring-[var(--primary)] shadow-md bg-[var(--primary-subtle)]/30' : 'hover:shadow-md'}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-[var(--text-primary)] leading-tight">
            {day.workoutName}
          </h2>
          <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            <Calendar className="h-3 w-3 shrink-0" />
            {day.day}
            {isRecommended && (
              <span className="ml-2 font-bold text-[var(--primary)]">(Today&apos;s Workout)</span>
            )}
          </span>
        </div>

        {/* Exercise count badge */}
        <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-[var(--primary-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--primary)]">
          <Dumbbell className="h-3 w-3" />
          {day.exerciseCount} {day.exerciseCount === 1 ? "exercise" : "exercises"}
        </span>
      </div>

      {/* Start button */}
      <Button
        id={`start-workout-${day.workoutId}`}
        className={`w-full ${isRecommended ? '' : (isDisabled ? 'opacity-50' : '')}`}
        disabled={isStarting || starting !== null || isDisabled}
        onClick={() => onStart(day.workoutId)}
        aria-label={`Start ${day.workoutName}`}
      >
        {isStarting ? (
          <>
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Starting…
          </>
        ) : (
          <>
            Start Workout
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </>
        )}
      </Button>
    </Card>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function WorkoutSessionsPage() {
  const router = useRouter();

  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasActiveProgram, setHasActiveProgram] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [hasStartedFirstSession, setHasStartedFirstSession] = useState(true);
  const [currentLocalWeekday, setCurrentLocalWeekday] = useState<string>("");

  // workoutId of the card currently being started (null if none)
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActive() {
      // Determine the user's current local weekday exactly on the client
      const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
      setCurrentLocalWeekday(dayName);

      try {
        const res = await fetch("/api/programs/active");

        if (res.status === 404) {
          setHasActiveProgram(false);
          setIsLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to load active program");
        }

        const data = await res.json();
        setWorkoutDays(data.workoutDays ?? []);
        
        if (typeof data.hasStartedFirstSession === 'boolean') {
          setHasStartedFirstSession(data.hasStartedFirstSession);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    }

    fetchActive();
  }, []);

  async function handleStartWorkout(workoutId: string) {
    setStarting(workoutId);
    try {
      const res = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone 
        },
        body: JSON.stringify({ workoutId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start workout");
      }

      const session = await res.json();
      router.push(`/workout-sessions/${session._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStarting(null);
    }
  }

  /* ── No active program ─────────────────────────────────────── */
  if (!hasActiveProgram && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-subtle)]">
          <Dumbbell className="h-8 w-8 text-[var(--primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            No active training program
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Create a program to start launching workouts.
          </p>
        </div>
        <Button asChild id="create-program-btn">
          <Link href="/programs/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Program
          </Link>
        </Button>
      </div>
    );
  }

  const isFirstWorkoutRestrictionActive = !hasStartedFirstSession && currentLocalWeekday !== "";

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Workout Launcher
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Pick a workout and start your session.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {isFirstWorkoutRestrictionActive && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-4 py-3 text-sm text-[var(--primary)] flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            <strong>New Program Activated:</strong> To begin your program correctly, your first session must be today&apos;s scheduled workout ({currentLocalWeekday}).
          </p>
        </div>
      )}

      {/* Workout cards / skeletons */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : workoutDays.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-16 text-center">
            <Dumbbell className="mx-auto mb-3 h-8 w-8 text-[var(--text-secondary)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              No workout days found in your active program.
            </p>
          </div>
        ) : (
          workoutDays.map((day) => {
            const isToday = day.day === currentLocalWeekday;
            const isDisabled = isFirstWorkoutRestrictionActive && !isToday;
            
            return (
              <WorkoutCard
                key={day.workoutId}
                day={day}
                onStart={handleStartWorkout}
                starting={starting}
                isDisabled={isDisabled}
                isRecommended={isFirstWorkoutRestrictionActive ? isToday : false}
              />
            );
          })
        )}
      </div>
    </div>
  );
}