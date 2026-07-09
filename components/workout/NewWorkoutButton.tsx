"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onClick?: () => void;
}

export default function NewWorkoutButton({ onClick }: Props) {
  return (
    <Button
      className="w-full h-12 active:scale-[0.98] transition-transform"
      onClick={onClick}
    >
      <Plus className="mr-2 h-5 w-5" />
      New Workout
    </Button>
  );
}