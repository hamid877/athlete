"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Activity, Target, Flame } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { NutritionHistoryItem } from "@/types";

interface HistoryData {
  history: NutritionHistoryItem[];
  averages: { calories: number; protein: number };
  adherence: { calories: number; protein: number };
}

export function NutritionHistory() {
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/nutrition/history?days=${days}`);
        if (!res.ok) throw new Error("Failed to fetch history");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [days]);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-center">
        <div className="inline-flex bg-[var(--background-subtle)] p-1 rounded-xl border border-[var(--border)]">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d as 7 | 14 | 30)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                days === d
                  ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-[var(--border)] bg-[var(--background-secondary)]">
          <CardContent className="p-4 text-center">
            <Flame className="h-5 w-5 text-orange-500 mx-auto mb-2" />
            <div className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wider font-semibold">Avg Calories</div>
            <div className="text-xl font-bold text-[var(--text-primary)]">{data.averages.calories}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{data.adherence.calories}% Target Adherence</div>
          </CardContent>
        </Card>
        
        <Card className="border-[var(--border)] bg-[var(--background-secondary)]">
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 text-blue-500 mx-auto mb-2" />
            <div className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wider font-semibold">Avg Protein</div>
            <div className="text-xl font-bold text-[var(--text-primary)]">{data.averages.protein}g</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{data.adherence.protein}% Target Adherence</div>
          </CardContent>
        </Card>
      </div>

      {/* Calories Chart */}
      <Card className="border-[var(--border)] bg-[var(--surface)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-500" />
            Calories Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.history} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="var(--text-muted)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="var(--text-muted)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="calories" 
                  name="Calories" 
                  stroke="#f97316" 
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#f97316', strokeWidth: 0 }}
                />
                <Line 
                  type="stepAfter" 
                  dataKey="targetCalories" 
                  name="Target" 
                  stroke="var(--text-muted)" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Protein Chart */}
      <Card className="border-[var(--border)] bg-[var(--surface)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            Protein Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.history} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="var(--text-muted)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="var(--text-muted)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                  cursor={{ fill: 'var(--background-subtle)' }}
                />
                <Bar 
                  dataKey="protein" 
                  name="Protein (g)" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
