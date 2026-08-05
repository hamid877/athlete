"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Brain, AlertCircle, Loader2 } from "lucide-react";
import GrowthIndexOverview from "./components/GrowthIndexOverview";
import CoachSection from "./components/CoachSection";
import MuscleIntelligenceSection from "./components/MuscleIntelligence";
import ForecastSection from "./components/ForecastSection";
import RecommendationsList from "./components/RecommendationsList";
import type { MuscleAnalysis, CoachAnalysis, ForecastAnalysis } from "@/lib/growth-intelligence";

interface FullGrowthData {
  hasData: boolean;
  message?: string;
  growthIndex: number;
  confidence: number;
  coachAnalysis: CoachAnalysis;
  muscleIntelligence: MuscleAnalysis[];
  forecast: ForecastAnalysis | null;
  history: { overallScore: number; [key: string]: unknown }[]; // Used for charts or history views if needed
  learningState?: {
    status: 'learning' | 'active';
    learningProgress: number;
    workoutsCompleted: number;
    workoutsRequired: number;
    estimatedUnlock: string;
  };
}

export default function GrowthClient() {
  const [data, setData] = useState<FullGrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/growth-intelligence/full");
        if (res.ok) {
          setData(await res.json());
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error fetching full growth intelligence", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 sticky top-0 bg-[var(--background)]/80 backdrop-blur-md z-20 py-4 border-b border-[var(--border)]">
        <Link 
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--border-hover)] transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--text-primary)]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Brain className="h-6 w-6 text-[var(--primary)]" />
            Growth Intelligence
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Advanced AI analysis of your training trajectory
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
          <p>Analyzing your training data...</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold">Analysis Unavailable</h2>
          <p className="text-[var(--text-muted)] text-center max-w-md">
            We encountered an error while processing your training data. Please try again later.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[var(--primary)] text-white font-semibold rounded-xl hover:bg-[var(--primary-hover)] transition-colors mt-2"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data && !data.hasData && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 max-w-md mx-auto">
          <div className="h-20 w-20 rounded-full bg-[var(--primary-subtle)] flex items-center justify-center relative overflow-hidden">
            <Brain className="h-10 w-10 text-[var(--primary)] opacity-50 relative z-10" />
            {data.learningState && (
              <div 
                className="absolute bottom-0 left-0 right-0 bg-[var(--primary)]/20 transition-all duration-1000"
                style={{ height: `${data.learningState.learningProgress}%` }}
              ></div>
            )}
          </div>
          <h2 className="text-2xl font-bold mt-2">
            {data.learningState ? "Learning Baseline..." : "Insufficient Data"}
          </h2>
          <p className="text-[var(--text-muted)] text-center">
            {data.message || "Log more workouts to unlock your personalized AI growth analysis."}
          </p>
          
          {data.learningState && (
            <div className="w-full flex flex-col gap-2 mt-4 p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-[var(--text-secondary)]">Progress</span>
                <span className="text-[var(--primary)]">{data.learningState.learningProgress}%</span>
              </div>
              <div className="h-3 w-full bg-[var(--background)] border border-[var(--border)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--primary)] transition-all duration-1000 ease-out" 
                  style={{ width: `${data.learningState.learningProgress}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mt-1">
                <span>{data.learningState.workoutsCompleted} / {data.learningState.workoutsRequired} workouts</span>
                <span>Unlock: ~{new Date(data.learningState.estimatedUnlock).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          <Link
            href="/workouts"
            className="px-6 py-3 bg-[var(--primary)] text-white font-semibold rounded-xl hover:bg-[var(--primary-hover)] transition-colors mt-6 w-full text-center"
          >
            Go to Workouts
          </Link>
        </div>
      )}

      {!loading && !error && data && data.hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <GrowthIndexOverview 
              growthIndex={data.growthIndex} 
              confidence={data.confidence} 
              history={data.history}
            />
            
            <CoachSection analysis={data.coachAnalysis} />

            <MuscleIntelligenceSection muscles={data.muscleIntelligence} />
          </div>

          {/* Sidebar Column */}
          <div className="flex flex-col gap-6">
            <ForecastSection forecast={data.forecast} />
            <RecommendationsList recommendations={data.coachAnalysis.recommendations} />
          </div>
        </div>
      )}
    </div>
  );
}
