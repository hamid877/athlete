import { Target, TrendingUp, Activity } from "lucide-react";

interface GrowthIndexOverviewProps {
  growthIndex: number;
  confidence: number;
  history: { overallScore: number; [key: string]: unknown }[];
}

export default function GrowthIndexOverview({ growthIndex, confidence, history }: GrowthIndexOverviewProps) {
  // Extract trend from history if available
  let weeklyTrend = null;
  if (history && history.length >= 2) {
    const latest = history[0].overallScore;
    const previous = history[1].overallScore;
    const change = latest - previous;
    const direction = change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable';
    weeklyTrend = { direction, change };
  }

  const trendIcon = weeklyTrend?.direction === 'improving' ? <TrendingUp className="h-5 w-5 text-green-500" /> :
                    weeklyTrend?.direction === 'declining' ? <TrendingUp className="h-5 w-5 text-red-500 rotate-180" /> :
                    <Activity className="h-5 w-5 text-yellow-500" />;

  const trendColor = weeklyTrend?.direction === 'improving' ? "text-green-500" :
                     weeklyTrend?.direction === 'declining' ? "text-red-500" : "text-yellow-500";

  return (
    <div className="flex flex-col gap-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-subtle)]">
              <Target className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Current Growth Index</h2>
          </div>
          <p className="text-[var(--text-muted)] text-sm max-w-sm mt-1">
            A unified metric representing your overall training effectiveness based on volume, overload, and recovery.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1">
          <div className="flex items-end gap-2">
            <span className="text-6xl font-black text-[var(--text-primary)] leading-none tracking-tighter">
              {growthIndex.toFixed(1)}
            </span>
            <span className="text-lg font-bold text-[var(--text-muted)] mb-1">/ 100</span>
          </div>
          
          <div className="flex items-center gap-4 mt-2">
            {weeklyTrend && (
              <div className={`flex items-center font-semibold ${trendColor}`}>
                {trendIcon}
                <span className="ml-1">{Math.abs(weeklyTrend.change).toFixed(1)} pts/wk</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--background)] rounded-full border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)]">
              <div className={`h-2 w-2 rounded-full ${confidence > 70 ? 'bg-green-500' : confidence > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              {confidence.toFixed(0)}% Confidence
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
