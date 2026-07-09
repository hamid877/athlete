"use client";

import { useEffect, useState, useCallback } from "react";
import NewWorkoutButton from "@/components/workout/NewWorkoutButton";
import WorkoutList from "@/components/workout/WorkoutList";
import CreateWorkoutDialog from "@/components/workout/CreateWorkoutDialog";
import { WorkoutItem } from "@/components/workout/WorkoutCard";

export default function WorkoutSetupPage() {
  const [workouts, setWorkouts] = useState<WorkoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchWorkouts = useCallback(async () => {
    try {
      const res = await fetch("/api/workouts");
      if (!res.ok) {
        throw new Error("Failed to fetch workouts");
      }
      const data = await res.json();
      setWorkouts(data);
    } catch (err) {
      console.error(err);
      setError("Could not load workouts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetchWorkouts = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchWorkouts();
  }, [fetchWorkouts]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWorkouts();
  }, [fetchWorkouts]);

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto px-1 sm:px-0">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
          My Workouts
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          Create and manage your workout routines.
        </p>
      </div>

      <div>
        <NewWorkoutButton onClick={() => setIsCreateOpen(true)} />
      </div>

      <div>
        <WorkoutList
          workouts={workouts}
          isLoading={isLoading}
          error={error}
          onRetry={refetchWorkouts}
          onCreateClick={() => setIsCreateOpen(true)}
        />
      </div>

      <CreateWorkoutDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreate={(newWorkout) => {
          setWorkouts((prev) => [...prev, newWorkout]);
        }}
      />
    </div>
  );
}