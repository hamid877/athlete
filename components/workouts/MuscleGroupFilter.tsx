"use client";

import { cn } from "@/lib/utils";

export type MuscleGroupFilter =
  | "all"
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core";

const MUSCLE_GROUPS: { value: MuscleGroupFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "arms", label: "Arms" },
  { value: "legs", label: "Legs" },
  { value: "core", label: "Core" },
];

interface MuscleGroupFilterProps {
  selected: MuscleGroupFilter;
  onChange: (group: MuscleGroupFilter) => void;
}

export function MuscleGroupFilterBar({
  selected,
  onChange,
}: MuscleGroupFilterProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
      role="group"
      aria-label="Filter by muscle group"
    >
      {MUSCLE_GROUPS.map((group) => (
        <button
          key={group.value}
          type="button"
          onClick={() => onChange(group.value)}
          className={cn(
            "shrink-0 rounded-[var(--radius-full)] px-3.5 py-1.5 text-xs font-medium transition-colors duration-150",
            selected === group.value
              ? "bg-[var(--primary)] text-white"
              : "bg-[var(--background-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
          )}
          aria-pressed={selected === group.value}
        >
          {group.label}
        </button>
      ))}
    </div>
  );
}
