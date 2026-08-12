"use client";

import { GoalDocument } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target } from "lucide-react";
import { format } from "date-fns";

interface GoalCardProps {
  goal: GoalDocument;
  onClick?: () => void;
}

const goalTypeLabels: Record<string, string> = {
  weight: "Bodyweight",
  bodyFat: "Body Fat",
  strength: "Strength / Lift",
  nutrition: "Nutrition",
  habit: "Consistency",
  muscle_growth: "Muscle Growth",
  consistency: "Consistency",
};

export function GoalCard({ goal, onClick }: GoalCardProps) {
  const isCompleted = goal.status === "achieved";
  const progressPercentage = Math.min(
    100,
    Math.max(0, (goal.currentValue / goal.targetValue) * 100)
  );

  return (
    <Card 
      className="cursor-pointer transition-colors hover:bg-[var(--bg-muted)] border-[var(--border)]"
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <div>
          <h3 className="font-semibold text-base text-[var(--text-primary)]">
            {goal.title}
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-1 flex items-center gap-1">
            <Target className="h-3.5 w-3.5" />
            {goalTypeLabels[goal.type] || goal.type}
          </p>
        </div>
        <Badge variant={isCompleted ? "default" : "secondary"}>
          {isCompleted ? "Achieved" : goal.status === "archived" ? "Archived" : "Active"}
        </Badge>
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        <div className="flex justify-between text-sm mb-2 text-[var(--text-primary)]">
          <span>{goal.currentValue} {goal.unit}</span>
          <span className="font-medium">{goal.targetValue} {goal.unit}</span>
        </div>
        <Progress value={progressPercentage} className="h-2 mb-3" />
        
        <div className="flex items-center text-xs text-[var(--text-muted)] gap-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Started: {format(new Date(goal.startDate), "MMM d, yyyy")}</span>
          </div>
          {goal.targetDate && (
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span>Target: {format(new Date(goal.targetDate), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
