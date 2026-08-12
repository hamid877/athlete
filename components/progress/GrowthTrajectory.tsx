"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface GrowthTrajectoryProps {
  history: Array<{
    analyzedAt: Date | string;
    overallScore: number;
  }>;
  forecast: {
    projectedGrowthIndex: number;
    forecastDate: Date | string;
    assumptions: string[];
  } | null;
}

export function GrowthTrajectory({ history, forecast }: GrowthTrajectoryProps) {
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    // History is sorted newest first. Reverse it for chronological order (left to right).
    const chronologicalHistory = [...history].reverse();

    const data: Array<{ date: string; actual: number | null; forecast: number | null; fullDate: Date | string }> = chronologicalHistory.map((h) => ({
      date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(h.analyzedAt)),
      actual: h.overallScore,
      forecast: null,
      fullDate: h.analyzedAt,
    }));

    // To connect the actual line to the forecast line, the forecast line must start at the current point.
    if (forecast && data.length > 0) {
      const currentPoint = data[data.length - 1];
      currentPoint.forecast = currentPoint.actual; // Bridge the gap

      // Add the future forecast point
      data.push({
        date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(forecast.forecastDate)),
        actual: null,
        forecast: forecast.projectedGrowthIndex,
        fullDate: forecast.forecastDate,
      });
    }

    return data;
  }, [history, forecast]);

  if (!history || history.length < 2) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">2. Am I improving?</h2>
        <Card>
          <CardHeader>
            <CardTitle>Growth Trajectory</CardTitle>
            <CardDescription>We need at least two weeks of data to show your trend.</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            Keep logging workouts to unlock your trajectory and predictions.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">2. Am I improving?</h2>
      <Card>
        <CardHeader>
          <CardTitle>Growth Trajectory & Forecast</CardTitle>
          <CardDescription>Your historical progress and 4-week AI projection.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                />
                
                {/* Historical Line (Solid) */}
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  name="Historical Growth"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                  connectNulls={true}
                />
                
                {/* Forecast Line (Dashed) */}
                <Line 
                  type="monotone" 
                  dataKey="forecast" 
                  name="4-Week Forecast"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  strokeDasharray="6 6"
                  dot={{ r: 4, fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '0' }}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {forecast && forecast.assumptions && forecast.assumptions.length > 0 && (
            <div className="bg-secondary/30 p-4 rounded-lg border border-border/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                About this Forecast
              </p>
              <ul className="space-y-1">
                {forecast.assumptions.map((assumption, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-primary">•</span> {assumption}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground/70 mt-3">
                * Predictions are estimates based on your past consistency and velocity, not guaranteed results.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
