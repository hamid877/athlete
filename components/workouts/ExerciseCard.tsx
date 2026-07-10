"use client";

import { Dumbbell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ExerciseDocument } from "@/types";

interface ExerciseCardProps {
  exercise: Pick<
    ExerciseDocument,
    "name" | "equipment" | "primaryMuscle" | "muscleGroup"
  > & { _id: string };
  selected?: boolean;
  onClick: () => void;
}

/** Formats a snake_case string into Title Case */
function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ExerciseCard({ exercise, selected, onClick }: ExerciseCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left"
      aria-pressed={selected}
    >
      <Card
        className={cn(
          "flex items-center gap-3 transition-colors duration-150",
          selected
            ? "border-[var(--primary)] bg-[var(--primary-subtle)]"
            : "hover:border-[var(--border-hover)] hover:bg-[var(--background-subtle)]"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
            selected
              ? "bg-[var(--primary)] text-white"
              : "bg-[var(--background-subtle)] text-[var(--text-muted)]"
          )}
        >
          <Dumbbell className="h-4 w-4" strokeWidth={1.75} />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {exercise.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
            {formatLabel(exercise.equipment)} &middot;{" "}
            {formatLabel(exercise.primaryMuscle)}
          </p>
        </div>
      </Card>
    </button>
  );
}
