import { Lightbulb, Zap, ShieldAlert, HeartPulse, Activity } from "lucide-react";
import type { GrowthRecommendation } from "@/lib/growth-intelligence";

export default function RecommendationsList({ recommendations }: { recommendations: GrowthRecommendation[] }) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-subtle)]">
            <Lightbulb className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Recommendations</h2>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Keep training! We need more data to generate personalized recommendations.
        </p>
      </div>
    );
  }

  const getIcon = (category: string) => {
    switch (category) {
      case 'volume': return <Activity className="h-4 w-4" />;
      case 'overload': return <Zap className="h-4 w-4" />;
      case 'recovery': return <HeartPulse className="h-4 w-4" />;
      case 'consistency': return <Activity className="h-4 w-4" />;
      case 'deload': return <ShieldAlert className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-green-500 bg-green-500/10 border-green-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] relative overflow-hidden">
      <div className="absolute -right-6 -top-6 opacity-5 pointer-events-none">
        <Lightbulb className="h-32 w-32 text-[var(--primary)]" />
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-subtle)]">
          <Lightbulb className="h-5 w-5 text-[var(--primary)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Action Plan</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Personalized recommendations</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-2 relative z-10">
        {recommendations.map((rec) => (
          <div key={rec.id} className="flex flex-col gap-2 p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)]">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${getPriorityColor(rec.priority)}`}>
                  {getIcon(rec.category)}
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] text-sm">{rec.title}</h3>
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)]">{rec.message}</p>
            <div className="mt-2 p-3 rounded-xl bg-[var(--primary-subtle)]/30 border border-[var(--primary-subtle)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] block mb-1">Action Step</span>
              <p className="text-sm font-medium text-[var(--text-primary)]">{rec.action}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
