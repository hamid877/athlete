"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import EmptyWorkoutState from "./EmptyWorkoutState";
import WorkoutCard, { WorkoutItem } from "./WorkoutCard";

const DAYS_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface WorkoutListProps {
  workouts?: WorkoutItem[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onCreateClick?: () => void;
}

export default function WorkoutList({
  workouts: propWorkouts,
  isLoading: propIsLoading,
  error: propError,
  onRetry,
  onCreateClick,
}: WorkoutListProps) {
  const isControlled = propWorkouts !== undefined;

  const [localWorkouts, setLocalWorkouts] = useState<WorkoutItem[]>([]);
  const [localIsLoading, setLocalIsLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const workouts = isControlled ? propWorkouts : localWorkouts;
  const isLoading = isControlled ? (propIsLoading ?? false) : localIsLoading;
  const error = isControlled ? (propError ?? null) : localError;

  useEffect(() => {
    if (isControlled) {
      return;
    }

    let active = true;

    async function fetchWorkouts() {
      try {
        const res = await fetch("/api/workouts");
        if (!res.ok) {
          throw new Error("Failed to fetch workouts");
        }
        const data = await res.json();
        if (active) {
          setLocalWorkouts(data);
          setLocalIsLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setLocalError("Could not load workouts. Please try again.");
          setLocalIsLoading(false);
        }
      }
    }

    fetchWorkouts();

    return () => {
      active = false;
    };
  }, [isControlled, retryCount]);

  const handleRetry = () => {
    if (isControlled) {
      onRetry?.();
    } else {
      setLocalIsLoading(true);
      setLocalError(null);
      setRetryCount((c) => c + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading workouts">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 animate-pulse"
          >
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 mb-1.5">
                <div className="h-5 w-20 rounded-full bg-[var(--border)]/70" />
                <div className="h-5 w-16 rounded-full bg-[var(--border)]/50" />
              </div>
              <div className="h-5 w-36 rounded-md bg-[var(--border)]/80 mb-2.5" />
              <div className="flex gap-4">
                <div className="h-4 w-16 rounded bg-[var(--border)]/60" />
                <div className="h-4 w-20 rounded bg-[var(--border)]/60" />
              </div>
            </div>
            <div className="h-5 w-5 rounded bg-[var(--border)]/70" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-6 text-center animate-fade-in-up" role="alert">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--danger)]/15 text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Unable to load workouts</h4>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--background-subtle)] active:scale-[0.98] transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (workouts.length === 0) {
    return <EmptyWorkoutState onCreateClick={onCreateClick} />;
  }

  const sortedWorkouts = [...workouts].sort((a, b) => {
    return DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day);
  });

  return (
    <div className="flex flex-col gap-4">
      {sortedWorkouts.map((workout, index) => (
        <WorkoutCard
          key={workout._id}
          workout={workout}
          index={index}
          onClick={() => {
            // Navigation/details placeholder - entire card is clickable
          }}
        />
      ))}
    </div>
  );
}

