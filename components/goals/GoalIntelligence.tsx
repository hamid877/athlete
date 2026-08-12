"use client";

import { useEffect, useState } from "react";
import { Brain, Activity, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface IntelligenceData {
  trajectory: {
    velocityPerWeek: number;
    estimatedDate: string | null;
    onTrack: boolean | null;
    isHeadingInRightDirection: boolean;
  } | null;
  insight: { text: string; priority: string } | null;
  readiness: {
    muscle: string;
    recoveryPercent: number;
    hoursRemaining: number;
    status: string;
  } | null;
}

export function GoalIntelligence({ goalId }: { goalId: string }) {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchIntel() {
      try {
        const res = await fetch(`/api/goals/${goalId}/intelligence`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchIntel();
  }, [goalId]);

  if (loading) {
    return (
      <div className="space-y-3 p-4 bg-[var(--bg-muted)] rounded-lg border border-[var(--border)] mb-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    );
  }

  if (error || !data) return null;

  const hasData = data.trajectory || data.insight || data.readiness;
  
  if (!hasData) {
    return (
      <div className="p-4 bg-[var(--bg-muted)] rounded-lg border border-[var(--border)] mb-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
          <Brain className="h-4 w-4 text-[var(--primary)]" />
          Goal Intelligence
        </div>
        <div className="flex items-start gap-2 text-[var(--text-muted)] text-xs">
          <Clock className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Keep logging to unlock insights and projections.</span>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    if (priority === 'critical') return 'text-red-500';
    if (priority === 'warning') return 'text-amber-500';
    if (priority === 'positive') return 'text-green-500';
    return 'text-[var(--text-muted)]';
  };

  return (
    <div className="p-4 bg-[var(--bg-muted)] rounded-lg border border-[var(--border)] mb-4 space-y-3 text-sm">
      <div className="flex items-center gap-2 font-medium text-[var(--text-primary)] mb-1">
        <Brain className="h-4 w-4 text-[var(--primary)]" />
        Goal Intelligence
      </div>
      
      {data.trajectory && (
        <div className="flex items-start gap-2">
          <TrendingUp className="h-4 w-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
          <div>
            <span className="text-[var(--text-primary)] font-medium">Trajectory: </span>
            <span className="text-[var(--text-muted)]">
              {data.trajectory.isHeadingInRightDirection 
                ? (data.trajectory.estimatedDate ? `On pace to hit target by ${format(new Date(data.trajectory.estimatedDate), 'MMM d, yyyy')}.` : 'Moving in the right direction.')
                : 'Not currently pacing towards target.'}
            </span>
          </div>
        </div>
      )}

      {data.insight && (
        <div className="flex items-start gap-2">
          <AlertCircle className={`h-4 w-4 mt-0.5 shrink-0 ${getPriorityColor(data.insight.priority)}`} />
          <div>
            <span className="text-[var(--text-primary)] font-medium">Insight: </span>
            <span className="text-[var(--text-muted)]">{data.insight.text}</span>
          </div>
        </div>
      )}

      {data.readiness && (
        <div className="flex items-start gap-2">
          <Activity className="h-4 w-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
          <div>
            <span className="text-[var(--text-primary)] font-medium">{data.readiness.muscle} Readiness: </span>
            <span className="text-[var(--text-muted)]">
              {data.readiness.recoveryPercent}% recovered. 
              {data.readiness.status === "Recovering" && ` Ready in ~${data.readiness.hoursRemaining}h.`}
            </span>
          </div>
        </div>
      )}

      {(!data.trajectory) && (
        <div className="flex items-start gap-2 text-[var(--text-muted)] text-xs mt-2 pt-2 border-t border-[var(--border)]">
          <Clock className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Keep logging to unlock trajectory projections.</span>
        </div>
      )}
    </div>
  );
}
