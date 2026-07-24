"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SetRow } from "./SetRow";
import { WorkoutSessionDTO, PopulatedWorkoutDTO } from "@/lib/serializers/workoutSession";

interface ActiveWorkoutClientProps {
  session: WorkoutSessionDTO;
  workout: PopulatedWorkoutDTO;
}

function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function ActiveWorkoutClient({ session, workout }: ActiveWorkoutClientProps) {
  // Sort session exercises by order
  const [exercises, setExercises] = useState(() => 
    [...session.exercises].sort((a, b) => a.order - b.order)
  );
  const router = useRouter();
  const [isFinishing, setIsFinishing] = useState(false);
  
  // Timer state
  const [restTimer, setRestTimer] = useState<{ active: boolean; remaining: number }>({
    active: false,
    remaining: 0,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Compute progress
  let totalPlannedSets = 0;
  let totalCompletedSets = 0;

  // Compute active set index
  let firstIncompleteExercise = -1;
  let firstIncompleteSet = -1;

  exercises.forEach((sessionEx, exIdx) => {
    const plannedEx = workout.exercises.find(
      (e) => e.exerciseId.toString() === sessionEx.exerciseId?._id?.toString()
    );
    const plannedSetsCount = plannedEx?.sets || 0;
    const actualSetsCount = Math.max(plannedSetsCount, sessionEx.performedSets.length);
    
    totalPlannedSets += actualSetsCount;
    
    sessionEx.performedSets.forEach((set, setIdx) => {
      if (set.completed) {
        totalCompletedSets++;
      } else if (firstIncompleteExercise === -1) {
        firstIncompleteExercise = exIdx;
        firstIncompleteSet = setIdx;
      }
    });

    // If there are implicit unlogged planned sets
    if (firstIncompleteExercise === -1 && sessionEx.performedSets.length < actualSetsCount) {
        firstIncompleteExercise = exIdx;
        firstIncompleteSet = sessionEx.performedSets.length;
    }
  });

  const progressPercent = totalPlannedSets > 0 ? Math.min(100, Math.round((totalCompletedSets / totalPlannedSets) * 100)) : 0;
  const isWorkoutComplete = totalPlannedSets > 0 && totalCompletedSets >= totalPlannedSets;

  const focusNextSet = useCallback(() => {
    // Small timeout to ensure DOM is ready
    setTimeout(() => {
      if (firstIncompleteExercise !== -1 && firstIncompleteSet !== -1) {
        const inputId = `weight-input-${firstIncompleteExercise}-${firstIncompleteSet}`;
        const input = document.getElementById(inputId);
        if (input) {
          input.focus();
        }
      }
    }, 100);
  }, [firstIncompleteExercise, firstIncompleteSet]);

  const handleTimerEnd = useCallback(() => {
    setRestTimer({ active: false, remaining: 0 });
    focusNextSet();
  }, [focusNextSet]);

  // Handle timer
  useEffect(() => {
    if (restTimer.active && restTimer.remaining > 0) {
      timerRef.current = setTimeout(() => {
        setRestTimer((prev) => {
          if (prev.remaining <= 1) return { active: false, remaining: 0 };
          return { ...prev, remaining: prev.remaining - 1 };
        });

        if (restTimer.remaining === 1) {
          focusNextSet();
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [restTimer, focusNextSet]);




  const handleSetComplete = (exIdx: number, setIdx: number, weight: number, reps: number, restSeconds: number) => {
    // Update local state to reflect completion instantly
    setExercises((prev) => {
      const newExercises = [...prev];
      const newSets = [...(newExercises[exIdx].performedSets || [])];
      
      // Ensure the array is large enough if we are completing an uninitialized set
      while (newSets.length <= setIdx) {
        newSets.push({ weight: 0, reps: 0, completed: false });
      }
      
      newSets[setIdx] = { ...newSets[setIdx], weight, reps, completed: true };
      newExercises[exIdx] = { ...newExercises[exIdx], performedSets: newSets };
      return newExercises;
    });

    // Start timer
    if (restSeconds > 0) {
      setRestTimer({ active: true, remaining: restSeconds });
    } else {
      // If no rest time, just focus next set
      focusNextSet();
    }
  };

  const handleFinishWorkout = async () => {
    try {
      setIsFinishing(true);
      const res = await fetch(`/api/workout-sessions/${session._id}/finish`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to finish workout");
      }
      router.push(`/workout-sessions/${session._id}/summary`);
    } catch (error) {
      console.error(error);
      alert("Error finishing workout");
      setIsFinishing(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Progress Bar Header */}
      <div className="sticky top-0 z-10 bg-[var(--background)] pt-2 pb-4 mb-4 border-b border-[var(--border)]">
        <div className="flex justify-between items-end mb-2">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Exercise {firstIncompleteExercise !== -1 ? firstIncompleteExercise + 1 : exercises.length} of {exercises.length}
          </p>
          <p className="text-sm font-semibold text-[var(--primary)]">
            {totalCompletedSets} / {totalPlannedSets} sets
          </p>
        </div>
        <Progress value={progressPercent} />
      </div>

      {/* Exercise list */}
      {exercises.length === 0 ? (
        <p className="text-center text-sm text-[var(--text-secondary)] py-10">
          No exercises in this session.
        </p>
      ) : (
        <div className={`space-y-6 ${isWorkoutComplete ? "pb-48" : "pb-24"}`}>
          {exercises.map((sessionEx, exerciseIndex) => {
            const plannedEx = workout.exercises.find(
              (e) => e.exerciseId.toString() === sessionEx.exerciseId?._id?.toString()
            );

            const repRangeLabel = plannedEx
              ? `${plannedEx.repRange.min}–${plannedEx.repRange.max}`
              : "–";

            const numSets = Math.max(
              plannedEx?.sets || 0,
              sessionEx.performedSets.length
            );
            const restDuration = plannedEx?.rest || 0;

            return (
              <Card key={`${sessionEx.exerciseId?._id ?? exerciseIndex}`} className="overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background-subtle)]">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {sessionEx.exerciseId?.name ?? "Unknown exercise"}
                  </p>
                  {plannedEx && (
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[var(--text-secondary)]">
                      <span>{plannedEx.sets} sets</span>
                      <span>{plannedEx.repRange.min}–{plannedEx.repRange.max} reps</span>
                      <span>{formatRest(plannedEx.rest)} rest</span>
                    </div>
                  )}
                </div>

                {numSets > 0 ? (
                  <div className="p-3 space-y-2">
                    {Array.from({ length: numSets }).map((_, setIndex) => {
                      const set = sessionEx.performedSets[setIndex] || {
                        weight: 0,
                        reps: 0,
                        completed: false,
                      };
                      const isActive =
                        exerciseIndex === firstIncompleteExercise &&
                        setIndex === firstIncompleteSet;

                      return (
                        <SetRow
                          key={`set-${setIndex}`}
                          sessionId={session._id}
                          exerciseIndex={exerciseIndex}
                          setIndex={setIndex}
                          initialSet={set}
                          repRangeLabel={repRangeLabel}
                          restDuration={restDuration}
                          isActive={isActive}
                          onComplete={handleSetComplete}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[var(--text-secondary)] text-center py-2">
                    No sets found
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Rest Timer Toast / Sticky Footer */}
      {restTimer.active && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-[var(--surface)] border-2 border-[var(--primary)] rounded-[var(--radius-lg)] shadow-2xl p-4 flex flex-col items-center justify-center animate-in slide-in-from-bottom-5 fade-in z-50">
          <p className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Rest Timer
          </p>
          <div className="text-5xl font-black text-[var(--primary)] tabular-nums my-2 tracking-tight">
            {restTimer.remaining}
          </div>
          <button
            onClick={handleTimerEnd}
            className="mt-2 text-sm font-medium px-4 py-2 rounded-full bg-[var(--background-subtle)] hover:bg-[var(--background-hover)] text-[var(--text-primary)] transition-colors"
          >
            Skip Rest
          </button>
        </div>
      )}

      {/* Finish Workout Fixed Button — sits above the fixed bottom nav (bottom-16 ≈ 64px nav height) */}
      {isWorkoutComplete && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-[var(--background)] to-transparent z-50">
          <Button
            className="w-full text-lg h-14 font-bold shadow-lg shadow-primary/20"
            size="lg"
            disabled={isFinishing}
            onClick={handleFinishWorkout}
          >
            {isFinishing ? "Finishing..." : "Finish Workout"}
          </Button>
        </div>
      )}
    </div>
  );
}
