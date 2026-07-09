import { Dumbbell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyWorkoutStateProps {
  onCreateClick?: () => void;
}

export default function EmptyWorkoutState({ onCreateClick }: EmptyWorkoutStateProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center flex flex-col items-center justify-center transition-all duration-200 hover:border-[var(--primary)]/40">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-subtle)] mb-4 animate-float">
        <Dumbbell className="h-6 w-6 text-[var(--primary)]" />
      </div>

      <h3 className="text-lg font-bold text-[var(--text-primary)]">
        No workouts yet
      </h3>

      <p className="mt-1.5 text-sm text-[var(--text-secondary)] max-w-xs mx-auto mb-5">
        Create your first workout to begin building your training program.
      </p>

      {onCreateClick && (
        <Button 
          onClick={onCreateClick}
          className="inline-flex items-center gap-1.5 shadow-md active:scale-[0.98] transition-transform"
        >
          <Plus className="h-4 w-4" />
          Create First Workout
        </Button>
      )}
    </div>
  );
}