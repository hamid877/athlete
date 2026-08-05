import { Target, Calendar, ArrowUpRight } from "lucide-react";
import type { ForecastAnalysis } from "@/lib/growth-intelligence";

interface ForecastSectionProps {
  forecast: ForecastAnalysis | null;
}

export default function ForecastSection({ forecast }: ForecastSectionProps) {
  if (!forecast) {
    return (
      <div className="flex flex-col gap-4 p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-subtle)]">
            <Target className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Forecast</h2>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Need more historical data to generate a reliable growth forecast.
        </p>
      </div>
    );
  }

  const { projectedGrowthIndex, projectedWeeklyGrowth, estimatedWeeksToTarget, confidence } = forecast;
  
  return (
    <div className="flex flex-col gap-5 p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] relative overflow-hidden">
      <div className="absolute -right-6 -top-6 opacity-5 pointer-events-none">
        <Target className="h-32 w-32 text-[var(--primary)]" />
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-subtle)]">
          <Target className="h-5 w-5 text-[var(--primary)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Growth Forecast</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Projected trajectory</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-2 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)] font-medium">Projected GI (4 Weeks)</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[var(--text-primary)]">{projectedGrowthIndex.toFixed(1)}</span>
            <ArrowUpRight className="h-5 w-5 text-green-500" />
          </div>
        </div>

        <div className="h-px w-full bg-[var(--border)]"></div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">Weekly Growth Rate</span>
            <span className="text-sm font-semibold">+{projectedWeeklyGrowth.toFixed(1)} pts/wk</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">Next Milestone</span>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[var(--primary)]" />
              <span className="text-sm font-semibold">{estimatedWeeksToTarget ? `${estimatedWeeksToTarget} weeks` : 'N/A'}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">Forecast Confidence</span>
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${confidence > 0.7 ? 'bg-green-500' : confidence > 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-semibold">{(confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
