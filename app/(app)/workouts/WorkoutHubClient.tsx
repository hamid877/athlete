"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Dumbbell,
  ChevronRight,
  Play,
  CheckCircle2,
  Moon,
  CalendarDays,
  Clock,
  Weight,
  Flame,
  Plus,
  LayoutGrid,
  History,
  BookOpen,
  Target,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import type { WorkoutHubAPIResponse } from "@/app/api/workouts/hub/route";

/* ── Helpers ──────────────────────────────────────────────── */

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg}kg`;
}

function formatElapsed(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const hrs = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m elapsed`;
  return `${mins}m elapsed`;
}

const SPLIT_LABELS: Record<string, string> = {
  push_pull_legs: "Push Pull Legs",
  bro_split: "Bro Split",
  upper_lower: "Upper / Lower",
  full_body: "Full Body",
  arnold: "Arnold Split",
  custom: "Custom Split",
};

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEK_ABBR = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/* ── Sub-components ──────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
      {children}
    </h2>
  );
}

function StatPill({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
          {label}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-subtle)]">
          <Icon className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" />
        </div>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold text-[var(--text-primary)] leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-[var(--text-muted)] mb-0.5">{unit}</span>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
  accent = false,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-2xl p-4 transition-all active:scale-[0.98] ${
        accent
          ? "bg-[var(--primary)] text-white"
          : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-hover)]"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          accent ? "bg-white/20" : "bg-[var(--primary-subtle)]"
        }`}
      >
        <Icon
          className={`h-5 w-5 ${accent ? "text-white" : "text-[var(--primary)]"}`}
          aria-hidden="true"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold leading-tight ${
            accent ? "text-white" : "text-[var(--text-primary)]"
          }`}
        >
          {label}
        </p>
        <p
          className={`mt-0.5 text-xs leading-tight ${
            accent ? "text-white/70" : "text-[var(--text-muted)]"
          }`}
        >
          {description}
        </p>
      </div>
      <ChevronRight
        className={`h-4 w-4 shrink-0 ${accent ? "text-white/60" : "text-[var(--text-muted)]"}`}
        aria-hidden="true"
      />
    </Link>
  );
}

/* ── Loading skeleton ────────────────────────────────────── */

function WorkoutHubSkeleton() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      {/* Active Workout banner */}
      <div className="h-14 w-full rounded-2xl bg-[var(--border)]" />
      {/* Training Status */}
      <div className="h-44 w-full rounded-2xl bg-[var(--border)]" />
      {/* This Week */}
      <div>
        <div className="h-3 w-20 rounded bg-[var(--border)] mb-3" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-24 rounded-2xl bg-[var(--border)]" />
          <div className="h-24 rounded-2xl bg-[var(--border)]" />
          <div className="h-24 rounded-2xl bg-[var(--border)]" />
        </div>
        <div className="mt-3 h-8 rounded-2xl bg-[var(--border)]" />
      </div>
      {/* Active Program */}
      <div>
        <div className="h-3 w-24 rounded bg-[var(--border)] mb-3" />
        <div className="h-40 w-full rounded-2xl bg-[var(--border)]" />
      </div>
      {/* Recent Workouts */}
      <div>
        <div className="h-3 w-28 rounded bg-[var(--border)] mb-3" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-full rounded-2xl bg-[var(--border)]" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   WorkoutHubClient
════════════════════════════════════════════════════════════ */

export default function WorkoutHubClient() {
  const [data, setData] = useState<WorkoutHubAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Incrementing this triggers a re-fetch (used by the Retry button)
  const [retryKey, setRetryKey] = useState(0);

  // Client-side elapsed timer — bumped every 60 s to keep "X min elapsed" fresh.
  const elapsedTick = useRef(0);
  const [, setElapsedVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setError(false);
      setLoading(true);
      try {
        const res = await fetch("/api/workouts/hub");
        if (!res.ok) throw new Error("Failed to load");
        const json = (await res.json()) as WorkoutHubAPIResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [retryKey]);

  // Tick every 60 s so elapsed time stays fresh.
  // setState is called inside the interval callback (not synchronously in the
  // effect body), which satisfies react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!data?.activeSession) return undefined;
    const id = setInterval(() => {
      elapsedTick.current += 1;
      setElapsedVersion(elapsedTick.current);
    }, 60_000);
    return () => clearInterval(id);
  }, [data?.activeSession]);

  /* ── Loading ── */
  if (loading) return <WorkoutHubSkeleton />;

  /* ── Error ── */
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <AlertCircle className="h-10 w-10 text-[var(--danger)]" strokeWidth={1.75} />
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Failed to load Workout Hub
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Check your connection and try again.
          </p>
        </div>
        <button
          onClick={() => setRetryKey((k) => k + 1)}
          className="px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    activeSession,
    todayWorkout,
    isTodayWorkoutCompleted,
    isRestDay,
    hasActiveProgram,
    activeProgram,
    thisWeek,
    recentSessions,
  } = data;

  /* ── Derive today index for the program schedule grid ── */
  // getDay() returns 0=Sun; WEEK_DAYS is Mon-based
  const jsDayIndex = new Date().getDay();
  const todayDayIndex = jsDayIndex === 0 ? 6 : jsDayIndex - 1; // 0=Mon

  /* ── Progress ── */
  const progressPct = Math.min(
    (thisWeek.completedCount / thisWeek.weeklyGoal) * 100,
    100,
  );

  return (
    <div className="flex flex-col gap-5">

      {/* ── 1. Active Workout Banner ── */}
      {activeSession && (
        <section aria-label="Active workout">
          <Link
            href={`/workout-sessions/${activeSession._id}`}
            className="flex items-center gap-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 transition-all active:scale-[0.99] hover:border-amber-500/50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
              <Dumbbell className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {activeSession.workoutName}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {formatElapsed(activeSession.startedAt)}
              </p>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
              <Play className="h-3 w-3 fill-current" aria-hidden="true" />
              Continue
            </span>
          </Link>
        </section>
      )}

      {/* ── 2. Training Status ── */}
      <section aria-label="Training status">
        <div className="rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] p-5 text-white shadow-lg shadow-[var(--primary)]/20 relative overflow-hidden">
          {/* decorative blur */}
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-white/80" aria-hidden="true" />
                <h2 className="text-sm font-medium text-white/90">Training Status</h2>
              </div>
              {activeSession && (
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  In Progress
                </span>
              )}
              {!activeSession && isTodayWorkoutCompleted && (
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  Done ✓
                </span>
              )}
              {!activeSession && isRestDay && (
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  Rest Day
                </span>
              )}
            </div>

            {/* State 1 — active session */}
            {activeSession ? (
              <div>
                <h3 className="text-xl font-bold mb-1">{activeSession.workoutName}</h3>
                <p className="text-sm text-white/80 mb-4">
                  Workout in progress · {formatElapsed(activeSession.startedAt)}
                </p>
                <Link
                  href={`/workout-sessions/${activeSession._id}`}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[var(--primary)] transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Continue Workout
                </Link>
              </div>

            /* State 2 — today completed */
            ) : isTodayWorkoutCompleted ? (
              <div>
                <h3 className="text-xl font-bold mb-1">Today&apos;s Workout Done</h3>
                <p className="text-sm text-white/80 mb-4">
                  Great work! Focus on nutrition and recovery for the rest of the day.
                </p>
                <Link
                  href="/workouts/history"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white/20 px-5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/30 active:scale-[0.98]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  View Session Summary
                </Link>
              </div>

            /* State 3 — today's workout available */
            ) : todayWorkout && !isRestDay ? (
              <div>
                <h3 className="text-xl font-bold mb-1">{todayWorkout.name}</h3>
                <p className="text-sm text-white/80 mb-4">
                  {todayWorkout.exerciseCount} exercise{todayWorkout.exerciseCount !== 1 ? "s" : ""} planned for today
                </p>
                <Link
                  href={`/workouts/${todayWorkout._id}`}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[var(--primary)] transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Start Workout
                </Link>
              </div>

            /* State 4 — rest day */
            ) : isRestDay ? (
              <div>
                <h3 className="text-xl font-bold mb-1">Rest Day</h3>
                <p className="text-sm text-white/80 mb-4">
                  Recovery is part of training. Let your muscles rebuild.
                </p>
                <Link
                  href="/programs"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white/20 px-5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/30 active:scale-[0.98]"
                >
                  <Moon className="h-4 w-4" />
                  View Program
                </Link>
              </div>

            /* State 5 — no active program */
            ) : (
              <div>
                <h3 className="text-xl font-bold mb-1">
                  {hasActiveProgram ? "No Workout Today" : "No Active Program"}
                </h3>
                <p className="text-sm text-white/80 mb-4">
                  {hasActiveProgram
                    ? "Today isn't mapped to a workout in your program."
                    : "Set up a training program to get personalized workouts."}
                </p>
                <Link
                  href={hasActiveProgram ? "/programs" : "/programs/create"}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[var(--primary)] transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  {hasActiveProgram ? "View Program" : "Create Program"}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 3. This Week ── */}
      <section aria-label="This week">
        <SectionLabel>This Week</SectionLabel>

        {/* Stat pills */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <StatPill
            label="Done"
            value={`${thisWeek.completedCount}/${thisWeek.weeklyGoal}`}
            icon={CalendarDays}
          />
          <StatPill
            label="Volume"
            value={formatVolume(thisWeek.totalVolume)}
            icon={Weight}
          />
          <StatPill
            label="Streak"
            value={thisWeek.currentStreak}
            unit="d"
            icon={Flame}
          />
        </div>

        {/* Progress bar */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              Weekly goal
            </span>
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {Math.round(progressPct)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--background-subtle)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
              role="progressbar"
              aria-valuenow={thisWeek.completedCount}
              aria-valuemin={0}
              aria-valuemax={thisWeek.weeklyGoal}
            />
          </div>
          <div className="flex justify-between mt-2">
            {WEEK_ABBR.map((abbr, i) => {
              const isToday = i === todayDayIndex;
              return (
                <div key={abbr} className="flex flex-col items-center gap-1">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      isToday
                        ? "bg-[var(--primary)]"
                        : "bg-[var(--background-subtle)]"
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`text-[9px] font-medium ${
                      isToday
                        ? "text-[var(--primary)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {abbr}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. Active Program ── */}
      <section aria-label="Active program">
        <SectionLabel>Active Program</SectionLabel>

        {activeProgram ? (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                  {activeProgram.name}
                </p>
                {activeProgram.splitType && (
                  <span className="mt-1 inline-block rounded-full bg-[var(--primary-subtle)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
                    {SPLIT_LABELS[activeProgram.splitType] ?? activeProgram.splitType}
                  </span>
                )}
              </div>
              <Link
                href={`/programs/${activeProgram._id}`}
                className="flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline shrink-0 ml-3"
              >
                Details <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Weekly schedule grid */}
            <div className="flex gap-1">
              {WEEK_DAYS.map((day, i) => {
                const programDay = activeProgram.workoutDays.find(
                  (wd) => wd.day === day,
                );
                const isToday = i === todayDayIndex;
                const isRest = programDay?.isRestDay ?? programDay?.workoutId === null;
                const name = programDay?.workoutName;

                return (
                  <div
                    key={day}
                    className={`flex-1 flex flex-col items-center gap-1 rounded-lg py-2 px-0.5 ${
                      isToday
                        ? "bg-[var(--primary-subtle)] border border-[var(--primary)]/30"
                        : "bg-[var(--background-subtle)]"
                    }`}
                    title={`${day}: ${isRest ? "Rest" : (name ?? "Workout")}`}
                  >
                    <span
                      className={`text-[9px] font-semibold uppercase ${
                        isToday ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {WEEK_ABBR[i]}
                    </span>
                    {isRest ? (
                      <Moon
                        className={`h-3 w-3 ${
                          isToday ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
                        }`}
                        aria-label="Rest"
                      />
                    ) : (
                      <Dumbbell
                        className={`h-3 w-3 ${
                          isToday ? "text-[var(--primary)]" : "text-[var(--text-secondary)]"
                        }`}
                        aria-label={name ?? "Workout"}
                      />
                    )}
                    {name && !isRest && (
                      <span
                        className={`text-[8px] font-medium text-center leading-tight line-clamp-1 max-w-full px-0.5 ${
                          isToday ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
                        }`}
                      >
                        {name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-subtle)]">
              <LayoutGrid className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">No active program</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Create a program to schedule your workouts.
              </p>
            </div>
            <Link
              href="/programs/create"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--primary-hover)] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Create Program
            </Link>
          </div>
        )}
      </section>

      {/* ── 5. Recent Workouts ── */}
      <section aria-label="Recent workouts">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Recent Workouts</SectionLabel>
          <Link
            href="/workouts/history"
            className="flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline -mt-3"
          >
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {recentSessions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {recentSessions.map((s) => (
              <Link
                key={s._id}
                href={`/workout-sessions/${s._id}/summary`}
                className="flex items-center gap-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-4 py-3 transition-all active:scale-[0.99] hover:border-[var(--border-hover)]"
              >
                {/* Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--background-subtle)]">
                  <Dumbbell className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
                </div>

                {/* Name + date */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {s.workoutName}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {formatDate(s.finishedAt)}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {s.duration != null && (
                    <div className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {formatDuration(s.duration)}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                    {formatVolume(s.totalVolume)}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--background-subtle)]">
              <History className="h-5 w-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">No workouts yet</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Complete your first session to see your history here.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── 6. Quick Actions ── */}
      <section aria-label="Quick actions">
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            href="/programs/create"
            icon={Plus}
            label="Create Program"
            description="Build a new training plan"
            accent
          />
          <QuickAction
            href="/workouts/templates"
            icon={BookOpen}
            label="Templates"
            description="Start from a proven plan"
          />
          <QuickAction
            href="/exercises"
            icon={Dumbbell}
            label="Exercise Library"
            description="Browse all exercises"
          />
          <QuickAction
            href="/workouts/history"
            icon={History}
            label="Workout History"
            description="Review past sessions"
          />
        </div>
      </section>

      {/* Bottom spacer */}
      <div className="h-2" aria-hidden="true" />
    </div>
  );
}
