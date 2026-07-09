"use client";

import { Card } from "@/components/ui/card";
import { ChevronRight, Calendar, Coffee, Clock, Dumbbell } from "lucide-react";

export interface WorkoutItem {
  _id: string;
  name: string;
  day: string;
  isRestDay?: boolean;
  estimatedDuration?: number;
  exercises?: Array<{
    exerciseId: string;
    sets: Array<{
      type: string;
      reps: number;
      weight: number;
    }>;
  }>;
}

interface WorkoutCardProps {
  workout: WorkoutItem;
  index?: number;
  onClick?: () => void;
}

export default function WorkoutCard({ workout, index, onClick }: WorkoutCardProps) {
  const animationDelay = index !== undefined ? `${index * 75}ms` : undefined;

  return (
    <Card
      onClick={onClick}
      style={{ animationDelay }}
      className="group relative overflow-hidden border border-[var(--border)] bg-[var(--surface)] p-5 transition-all duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--background-subtle)] active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] animate-fade-in-up"
      role="button"
      tabIndex={0}
      aria-label={`${workout.day} Workout: ${workout.name}${workout.isRestDay ? ", Rest Day" : `, ${workout.estimatedDuration || 60} minutes, ${workout.exercises?.length || 0} exercises`}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)]">
              <Calendar className="h-3 w-3" />
              {workout.day}
            </span>
            {workout.isRestDay && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--background-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                <Coffee className="h-3 w-3" />
                Rest Day
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--primary)] transition-colors">
            {workout.name}
          </h3>

          {!workout.isRestDay && (
            <div className="mt-2.5 flex items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                {workout.estimatedDuration || 60} min
              </span>
              <span className="flex items-center gap-1">
                <Dumbbell className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                {workout.exercises?.length || 0} exercises
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
          <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Card>
  );
}

