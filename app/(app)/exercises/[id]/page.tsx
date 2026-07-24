"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Dumbbell, Activity, TrendingUp, History } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import type { ExerciseDocument } from "@/types";

import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import type { TooltipContentProps } from "recharts";
interface HistoryData {
  sessionId: string;
  date: string;
  maxWeight: number;
  volume: number;
  estimated1RM: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipContentProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--surface)] border border-[var(--border)] p-3 rounded-[var(--radius-md)] shadow-lg">
          <p className="text-[var(--text-secondary)] text-sm mb-1">{label}</p>
          <p className="font-semibold text-[var(--text-primary)]">
            {payload[0].value} {payload[0].name === "Volume" ? "kg" : "kg"}
          </p>
        </div>
      );
    }
    return null;
  };

export default function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [exercise, setExercise] = useState<ExerciseDocument | null>(null);
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [exerciseRes, historyRes] = await Promise.all([
          fetch(`/api/exercises/${id}`),
          fetch(`/api/exercises/${id}/history`),
        ]);

        if (exerciseRes.ok) {
          const exerciseData = await exerciseRes.json();
          setExercise(exerciseData);
        }

        if (historyRes.ok) {
          const historyData = await historyRes.json();
          // Format dates for charts
          const formattedHistory = historyData.map((h: HistoryData) => ({
            ...h,
            formattedDate: new Date(h.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            }),
          }));
          setHistory(formattedHistory);
        }
      } catch (error) {
        console.error("Failed to fetch exercise data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-[var(--surface)] animate-pulse rounded" />
        <div className="h-64 bg-[var(--surface)] animate-pulse rounded-[var(--radius-lg)]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-[var(--surface)] animate-pulse rounded-[var(--radius-lg)]" />
          <div className="h-64 bg-[var(--surface)] animate-pulse rounded-[var(--radius-lg)]" />
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="text-center py-20 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]">
        <Dumbbell className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-[var(--text-primary)]">Exercise not found</h3>
        <Link href="/exercises" className="text-[var(--brand)] hover:underline mt-2 inline-block">
          Return to library
        </Link>
      </div>
    );
  }

  

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/exercises" 
          className="p-2 rounded-[var(--radius-full)] hover:bg-[var(--background-subtle)] transition-colors text-[var(--text-secondary)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{exercise.name}</h1>
          <div className="flex gap-2 mt-1">
            <span className="text-sm text-[var(--text-secondary)] capitalize">{exercise.muscleGroup.replace("_", " ")}</span>
            <span className="text-sm text-[var(--text-muted)]">•</span>
            <span className="text-sm text-[var(--text-secondary)] capitalize">{exercise.equipment.replace("_", " ")}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Media Placeholder */}
          <div className="aspect-video bg-[var(--background-subtle)] border border-[var(--border)] rounded-[var(--radius-lg)] flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)]/80 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="z-20 text-center flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-[var(--brand)]/20 text-[var(--brand)] flex items-center justify-center mb-2">
                <Play className="h-6 w-6 ml-1" />
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">Watch Tutorial</span>
            </div>
          </div>

          {/* Info Card */}
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-[var(--brand)]" />
                Exercise Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider font-semibold">Primary Muscle</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{exercise.primaryMuscle.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider font-semibold">Type</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{exercise.exerciseType}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider font-semibold">Difficulty</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{exercise.difficulty}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider font-semibold">Mechanics</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{exercise.isCompound ? "Compound" : "Isolation"}</p>
                </div>
              </div>

              {exercise.instructions && exercise.instructions.length > 0 && (
                <div className="pt-4 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider font-semibold">Instructions</p>
                  <ol className="list-decimal list-inside space-y-2">
                    {exercise.instructions.map((step, i) => (
                      <li key={i} className="text-sm text-[var(--text-secondary)] pl-1">{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Performance Data */}
        <div className="lg:col-span-2 space-y-6">
          {history.length > 0 ? (
            <>
              {/* Estimated 1RM Trend */}
              <Card className="bg-[var(--surface)] border-[var(--border)]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    Estimated 1RM Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis 
                          dataKey="formattedDate" 
                          stroke="var(--text-muted)" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis 
                          stroke="var(--text-muted)" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                          dx={-10}
                        />
                        <Tooltip content={CustomTooltip } />
                        <Line 
                          type="monotone" 
                          dataKey="estimated1RM" 
                          name="Est. 1RM" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Max Weight Trend */}
                <Card className="bg-[var(--surface)] border-[var(--border)]">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Dumbbell className="h-5 w-5 text-blue-500" />
                      Max Weight
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="formattedDate" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                          <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip content={CustomTooltip} />
                          <Line type="stepAfter" dataKey="maxWeight" name="Max Weight" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Volume Trend */}
                <Card className="bg-[var(--surface)] border-[var(--border)]">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <History className="h-5 w-5 text-purple-500" />
                      Volume
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="formattedDate" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                          <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip content={CustomTooltip} cursor={{ fill: 'var(--background-subtle)' }} />
                          <Bar dataKey="volume" name="Volume" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="bg-[var(--surface)] border-[var(--border)] h-full flex flex-col items-center justify-center py-20">
              <TrendingUp className="h-16 w-16 text-[var(--text-muted)] mb-4 opacity-50" />
              <h3 className="text-xl font-medium text-[var(--text-primary)] mb-2">No Data Yet</h3>
              <p className="text-[var(--text-secondary)] text-center max-w-md">
                Log workouts containing {exercise.name} to see your performance trends and estimated 1RM calculations over time.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
