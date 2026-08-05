"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  TrendingUp,
  Target,
  Activity,
  ArrowRight,
  Zap,
  AlertCircle,
  CheckCircle,
  Dumbbell,
  Flame,
} from "lucide-react";
import Link from "next/link";

// ─── State machine phases ────────────────────────────────────────────────────

type GrowthPhase = "LEARNING" | "BASELINE_ESTABLISHED" | "ONGOING_ANALYSIS";

// ─── API response shape ──────────────────────────────────────────────────────

interface LearningState {
  status: "learning" | "active";
  learningProgress: number;   // 0–100, always capped
  workoutsCompleted: number;  // always ≤ workoutsRequired
  workoutsRequired: number;
  estimatedUnlock: string;
}

interface GrowthDashboardData {
  hasData: boolean;
  phase: GrowthPhase;
  message?: string;
  learningState: LearningState;
  // Only present when hasData === true
  growthIndex?: number;
  confidence?: number;
  weeklyTrend?: {
    direction: "improving" | "declining" | "stable" | "insufficient_data";
    change: number;
  };
  velocity?: number;
  forecast?: {
    projectedGI: number;
    weeksToNextMilestone: number | null;
  };
  insights?: {
    topPositive: string | null;
    improvementArea: string | null;
  };
  primaryStrength?: string | null;
  weakestMuscleGroup?: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GrowthIntelligenceCard() {
  const [data, setData] = useState<GrowthDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/dashboard/growth-intelligence");
        if (res.ok) {
          setData(await res.json());
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error fetching growth intelligence data", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 animate-pulse">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-6 w-6 bg-[var(--border)] rounded-md"></div>
          <div className="h-5 w-40 bg-[var(--border)] rounded-md"></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-[var(--border)] rounded-xl"></div>
          <div className="h-20 bg-[var(--border)] rounded-xl"></div>
        </div>
        <div className="h-16 bg-[var(--border)] rounded-xl mt-2"></div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-[var(--surface)] border border-red-500/20 p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle className="h-5 w-5" />
          <h3 className="font-semibold">Growth Intelligence Unavailable</h3>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Failed to load your analysis. Please try again later.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="self-start mt-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm hover:bg-[var(--border-hover)] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── No data at all (edge case: API returned hasData: false without learningState) ──

  if (!data) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-subtle)]">
            <Brain className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <h3 className="font-semibold text-[var(--text-primary)]">Growth Intelligence</h3>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Log your first few workouts to unlock personalized AI growth analysis.
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE MACHINE
  // ─────────────────────────────────────────────────────────────────────────

  const phase: GrowthPhase = data.phase ?? (data.hasData ? "ONGOING_ANALYSIS" : "LEARNING");

  // ── LEARNING ──────────────────────────────────────────────────────────────

  if (phase === "LEARNING") {
    const ls = data.learningState;
    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 relative overflow-hidden group">
        {/* Decorative background icon */}
        <div className="absolute -right-10 -top-10 text-[var(--primary)] opacity-5 transition-transform group-hover:scale-110 group-hover:rotate-12 duration-700">
          <Brain className="h-40 w-40" />
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-subtle)]">
            <Brain className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Growth Intelligence</h3>
            <p className="text-xs text-[var(--text-muted)]">AI Analysis Engine</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-2 relative z-10 w-full">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>
              {ls.workoutsCompleted} / {ls.workoutsRequired} workouts
            </span>
            <span>{ls.learningProgress}%</span>
          </div>
          <div className="h-2 w-full bg-[var(--background)] border border-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--primary)] transition-all duration-1000 ease-out"
              style={{ width: `${ls.learningProgress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 text-center">
            Learning your baseline trajectory...
          </p>
        </div>
      </div>
    );
  }

  // ── BASELINE_ESTABLISHED ──────────────────────────────────────────────────

  if (phase === "BASELINE_ESTABLISHED") {
    return (
      <div className="flex flex-col gap-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 relative overflow-hidden">
        {/* Decorative background icon */}
        <div className="absolute -right-8 -top-8 text-[var(--primary)] opacity-5 pointer-events-none">
          <Brain className="h-48 w-48" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-subtle)]">
            <Brain className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Growth Intelligence</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-500 font-medium">Baseline Established</span>
            </div>
          </div>
        </div>

        {/* Core metrics */}
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="flex flex-col gap-1 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Growth Index
            </span>
            <span className="text-3xl font-bold text-[var(--text-primary)] leading-none">
              {data.growthIndex?.toFixed(1)}
            </span>
          </div>

          <div className="flex flex-col gap-1 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Confidence
            </span>
            <span className="text-3xl font-bold text-[var(--text-primary)] leading-none">
              {data.confidence?.toFixed(0)}
              <span className="text-base font-medium text-[var(--text-muted)] ml-0.5">%</span>
            </span>
          </div>
        </div>

        {/* Muscle breakdown */}
        {(data.primaryStrength ?? data.weakestMuscleGroup) && (
          <div className="grid grid-cols-2 gap-3 relative z-10">
            {data.primaryStrength && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                <Dumbbell className="h-4 w-4 text-green-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Primary Strength
                  </p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {data.primaryStrength}
                  </p>
                </div>
              </div>
            )}
            {data.weakestMuscleGroup && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                <Flame className="h-4 w-4 text-yellow-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Needs Work
                  </p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {data.weakestMuscleGroup}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* View Analysis CTA */}
        <div className="relative z-10">
          <Link
            href="/dashboard/growth"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            View Analysis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ── ONGOING_ANALYSIS ───────────────────────────────────────────────────────

  const { growthIndex, confidence, weeklyTrend, velocity, forecast, insights } = data;

  const trendIcon =
    weeklyTrend?.direction === "improving" ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : weeklyTrend?.direction === "declining" ? (
      <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
    ) : (
      <Activity className="h-4 w-4 text-yellow-500" />
    );

  const trendColor =
    weeklyTrend?.direction === "improving"
      ? "text-green-500"
      : weeklyTrend?.direction === "declining"
        ? "text-red-500"
        : "text-yellow-500";

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute -right-8 -top-8 text-[var(--primary)] opacity-5 pointer-events-none">
        <Brain className="h-48 w-48" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-subtle)]">
            <Brain className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Growth Intelligence</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
              <span className="text-xs text-[var(--text-muted)]">
                Active • {confidence?.toFixed(0)}% Confidence
              </span>
            </div>
          </div>
        </div>
        <Link
          href="/dashboard/growth"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div className="flex flex-col gap-1 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Growth Index
          </span>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-[var(--text-primary)] leading-none">
              {growthIndex?.toFixed(1)}
            </span>
            {weeklyTrend && weeklyTrend.direction !== "insufficient_data" && (
              <div className={`flex items-center text-sm font-semibold mb-1 ${trendColor}`}>
                {trendIcon}
                <span className="ml-1">{Math.abs(weeklyTrend.change).toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Growth Velocity
          </span>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-[var(--text-primary)] leading-none">
              {velocity ? (velocity > 0 ? "+" : "") + velocity.toFixed(1) : "0.0"}
            </span>
            <span className="text-sm font-medium text-[var(--text-muted)] mb-1">pts/wk</span>
          </div>
        </div>
      </div>

      {/* Forecast & Insights */}
      <div className="flex flex-col gap-3 relative z-10 mt-1">
        {forecast && forecast.projectedGI > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--primary-subtle)]/50 border border-[var(--primary-subtle)]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10">
              <Target className="h-4 w-4 text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                Forecast: {forecast.projectedGI.toFixed(1)} GI
              </p>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {forecast.weeksToNextMilestone
                  ? `Estimated ${forecast.weeksToNextMilestone} weeks to next milestone`
                  : `Projected 4-week trajectory`}
              </p>
            </div>
          </div>
        )}

        {insights?.topPositive && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <Zap className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            <p className="text-sm text-[var(--text-primary)]">{insights.topPositive}</p>
          </div>
        )}

        {insights?.improvementArea && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-sm text-[var(--text-primary)]">{insights.improvementArea}</p>
          </div>
        )}
      </div>
    </div>
  );
}
