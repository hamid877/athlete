/**
 * @file muscle-analysis.service.ts
 * @module lib/growth-intelligence
 * @description
 *   Muscle Intelligence Engine — analyses individual muscle groups to determine
 *   their growth potential, trends, and specific recommendations.
 */

import type { IGrowthAnalysisSnapshot } from '@/models/GrowthAnalysisSnapshot';
import { TrendDirection, classifyTrend } from './comparison.service';
import { clampScore, resolveScoreStatus } from './helpers';
import type { ScoreStatus, Score, MuscleGrowthDetail, GrowthAnalysisInput } from './types';
import { analyzeWeeklyVolume } from '../performance/volume';
import { calculateAllStimulus } from '../performance/stimulus';
import { calculateAllRecovery } from '../performance/recovery';
import type { CompletedWorkout } from '../performance/types';
import type { WorkoutSessionDTO } from '@/lib/serializers/workoutSession';
import { VOLUME_OPTIMAL_MIN_SETS, VOLUME_OPTIMAL_MAX_SETS } from './constants';

export const SUPPORTED_MUSCLES = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'
];

/**
 * Extended muscle analysis including historical trend direction.
 */
export interface MuscleAnalysis extends MuscleGrowthDetail {
  trend: TrendDirection;
}

// ─── Bridge Helpers ─────────────────────────────────────────────────────────

function sessionToCompletedWorkout(session: WorkoutSessionDTO): CompletedWorkout {
  return {
    completedAt: session.finishedAt ?? session.startedAt,
    exercises: session.exercises
      .filter((ex) => ex.exerciseId !== null)
      .map((ex) => ({
        name: ex.exerciseId!.name,
        targetMuscles: ex.exerciseId!.primaryMuscle ? [ex.exerciseId!.primaryMuscle] : [],
        performedSets: (ex.performedSets ?? []).map(s => ({
          weight: s.weight || 0,
          reps: s.reps || 0,
          completed: s.completed ?? true
        })),
      })),
  };
}

// ─── Engine Methods ─────────────────────────────────────────────────────────

/**
 * Calculates a composite growth potential score [0, 100] based on volume, stimulus, and recovery.
 */
export function calculateGrowthPotential(
  weeklySets: number,
  optimalRange: { min: number; max: number },
  stimulusScore: number,
  recoveryPercent: number
): Score {
  // Volume score mapping
  let volumeScore = 50;
  if (weeklySets >= optimalRange.min && weeklySets <= optimalRange.max) volumeScore = 100;
  else if (weeklySets > optimalRange.max) volumeScore = 80;
  else if (weeklySets >= optimalRange.min / 2) volumeScore = 60;
  else if (weeklySets > 0) volumeScore = 30;
  else volumeScore = 0;

  const weightedSum = (volumeScore * 0.40) + (stimulusScore * 0.35) + (recoveryPercent * 0.25);
  return clampScore(weightedSum);
}

/**
 * Generates a specific actionable recommendation for the muscle group.
 */
export function generateRecommendation(muscle: string, status: ScoreStatus, isBottleneck: boolean): string {
  if (isBottleneck) return `Increase high-quality volume on ${muscle} to break through the current bottleneck.`;
  if (status === 'critical' || status === 'poor') return `Significantly undertrained. Add targeted exercises for ${muscle}.`;
  if (status === 'fair') return `Room for improvement. Consider adding 2-3 weekly sets for ${muscle}.`;
  return `Optimal growth trajectory for ${muscle}. Maintain current stimulus and recovery.`;
}

/**
 * Analyzes historical snapshots to determine the trend direction for a muscle.
 */
export function calculateMuscleTrend(muscle: string, snapshots: IGrowthAnalysisSnapshot[]): TrendDirection {
  if (snapshots.length < 2) return TrendDirection.InsufficientData;
  const sorted = [...snapshots].sort((a, b) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime());
  
  const firstDetail = sorted[0].muscleDetails?.find((m) => (m as MuscleGrowthDetail).muscle === muscle) as MuscleGrowthDetail | undefined;
  const latestDetail = sorted[sorted.length - 1].muscleDetails?.find((m) => (m as MuscleGrowthDetail).muscle === muscle) as MuscleGrowthDetail | undefined;
  
  if (!firstDetail || !latestDetail) return TrendDirection.InsufficientData;
  
  const change = latestDetail.growthPotentialScore - firstDetail.growthPotentialScore;
  return classifyTrend(change);
}

/**
 * Performs a complete analysis for a single muscle group.
 */
export function analyseMuscleGroup(
  muscle: string,
  weeklySets: number,
  stimulusScore: number,
  recoveryPercent: number,
  snapshots: IGrowthAnalysisSnapshot[],
  isPrimary: boolean
): MuscleAnalysis {
  const optimalRange = { min: VOLUME_OPTIMAL_MIN_SETS, max: VOLUME_OPTIMAL_MAX_SETS };
  const growthPotentialScore = calculateGrowthPotential(weeklySets, optimalRange, stimulusScore, recoveryPercent);
  const status = resolveScoreStatus(growthPotentialScore);
  
  const isBottleneck = isPrimary && (status === 'critical' || status === 'poor' || status === 'fair');
  const recommendation = generateRecommendation(muscle, status, isBottleneck);
  const trend = calculateMuscleTrend(muscle, snapshots);

  return {
    muscle,
    weeklySets,
    stimulusScore,
    recoveryPercent,
    growthPotentialScore,
    status,
    recommendation,
    isBottleneck,
    trend
  };
}

/**
 * Analyses all supported muscles using the current inputs and historical snapshots.
 */
export function analyseAllMuscles(
  input: GrowthAnalysisInput,
  snapshots: IGrowthAnalysisSnapshot[]
): MuscleAnalysis[] {
  // Sort and filter sessions
  const completedSessions = input.sessions.filter(s => s.status === 'completed');
  const sortedSessions = [...completedSessions].sort((a, b) => {
    const aTime = new Date(a.startedAt).getTime();
    const bTime = new Date(b.startedAt).getTime();
    return aTime - bTime;
  });

  const history = sortedSessions.map(sessionToCompletedWorkout);

  // 1. Volume
  // Use last 7 days for current weekly volume
  const sevenDaysAgo = new Date(input.windowEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentSessions = history.filter(h => new Date(h.completedAt).getTime() >= sevenDaysAgo.getTime());
  const volumeData = analyzeWeeklyVolume(recentSessions);

  // 2. Stimulus
  // Use last 7 days for current stimulus
  const stimulusData = calculateAllStimulus(recentSessions);

  // 3. Recovery
  // Calculate recovery at the current moment (windowEnd) using full history
  const recoveryData = calculateAllRecovery(history, input.windowEnd);

  // Find primary muscles (trained frequently)
  const allTrainedMuscles = history.flatMap(h => h.exercises.flatMap(e => e.targetMuscles));
  const muscleFrequencies = allTrainedMuscles.reduce((acc, muscle) => {
    acc[muscle] = (acc[muscle] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const analysisResults: MuscleAnalysis[] = [];

  for (const muscle of SUPPORTED_MUSCLES) {
    const vol = volumeData.find(v => v.muscle === muscle);
    const stim = stimulusData.find(s => s.muscle === muscle);
    const rec = recoveryData.muscles.find((r) => (r as unknown as Record<string, unknown>).muscle === muscle);

    const weeklySets = vol?.weeklySets || 0;
    const stimulusScore = stim?.stimulusScore || 0;
    const recoveryPercent = rec?.recovery || 100; // 100% recovered if not trained
    
    const isPrimary = (muscleFrequencies[muscle] || 0) > 2; // threshold for primary muscle focus

    const analysis = analyseMuscleGroup(
      muscle,
      weeklySets,
      stimulusScore,
      recoveryPercent,
      snapshots,
      isPrimary
    );

    analysisResults.push(analysis);
  }

  return analysisResults;
}
