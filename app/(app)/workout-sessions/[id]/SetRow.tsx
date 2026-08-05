"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PerformedSetDTO } from "@/lib/serializers/workoutSession";

interface SetRowProps {
  sessionId: string;
  exerciseIndex: number;
  setIndex: number;
  initialSet: PerformedSetDTO;
  repRangeLabel: string;
  restDuration: number;
  isActive?: boolean;
  onComplete?: (exIdx: number, setIdx: number, weight: number, reps: number, restSeconds: number) => void;
  weightInputType?: string;
}

function getWeightLabel(type?: string): string {
  switch (type) {
    case "PER_DUMBBELL": return "Weight (each dumbbell)";
    case "MACHINE_STACK": return "Machine weight";
    case "BODYWEIGHT_PLUS": return "Additional weight";
    case "BODYWEIGHT": return "Bodyweight";
    case "PLATE_LOADED": return "Plate weight";
    case "TOTAL_WEIGHT":
    default:
      return "Weight (total)";
  }
}

export function SetRow({
  sessionId,
  exerciseIndex,
  setIndex,
  initialSet,
  repRangeLabel,
  restDuration,
  isActive,
  onComplete,
  weightInputType,
}: SetRowProps) {
  const weightLabel = getWeightLabel(weightInputType);
  const [weight, setWeight] = useState(
    initialSet.completed ? String(initialSet.weight) : ""
  );
  const [reps, setReps] = useState(
    initialSet.completed ? String(initialSet.reps) : ""
  );
  const [completed, setCompleted] = useState(initialSet.completed);
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps, 10);

    if (isNaN(weightNum) || weightNum < 0) {
      toast.error("Weight must be ≥ 0");
      return;
    }
    if (isNaN(repsNum) || repsNum < 1) {
      toast.error("Reps must be > 0");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/workout-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseIndex,
          setIndex,
          weight: weightNum,
          reps: repsNum,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to log set");
        return;
      }

      setCompleted(true);
      toast.success(`Set ${setIndex + 1} logged successfully!`);
      if (onComplete) {
        onComplete(exerciseIndex, setIndex, weightNum, repsNum, restDuration);
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (completed) {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 bg-[color-mix(in_srgb,var(--success)_8%,transparent)] rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--success)_30%,transparent)] opacity-60 transition-opacity">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--text-primary)] w-12">
            Set {setIndex + 1}
          </span>
          <span className="text-sm text-[var(--text-secondary)]">
            {weight} kg × {reps} reps
          </span>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)] border border-[color-mix(in_srgb,var(--success)_30%,transparent)]">
          ✓ Completed
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 px-3 py-2.5 bg-[var(--background-subtle)] rounded-[var(--radius-sm)] border transition-all ${isActive ? 'border-[var(--primary)] ring-1 ring-[var(--primary)] shadow-sm' : 'border-[var(--border)]'}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-[var(--text-primary)] w-12 shrink-0">
          Set {setIndex + 1}
        </span>

        <span className="text-sm text-[var(--text-secondary)] shrink-0">
          {repRangeLabel} reps
        </span>

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex flex-col">
            <label htmlFor={`weight-input-${exerciseIndex}-${setIndex}`} className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1 pl-1">
              {weightLabel}
            </label>
            <input
              id={`weight-input-${exerciseIndex}-${setIndex}`}
              type="number"
              min="0"
              step="0.5"
              placeholder="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              disabled={loading}
              aria-label={`Set ${setIndex + 1} weight in kg`}
              className="w-16 text-sm text-center px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
            />
            <span className="text-xs text-[var(--text-secondary)]">kg</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              step="1"
              placeholder="0"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              disabled={loading}
              aria-label={`Set ${setIndex + 1} reps`}
              className="w-14 text-sm text-center px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
            />
            <span className="text-xs text-[var(--text-secondary)]">reps</span>
          </div>

          <button
            onClick={handleComplete}
            disabled={loading}
            aria-label={`Complete set ${setIndex + 1}`}
            className="text-sm font-medium px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "…" : "Done"}
          </button>
        </div>
      </div>

    </div>
  );
}
