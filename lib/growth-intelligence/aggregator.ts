import {
  getGrowthSnapshotHistory,
  analyzeGrowth,
  forecastGrowthIndex,
  analyseAllMuscles,
  generateTrainingReadiness,
  generateRecoveryAdvice,
  generateCoachRecommendations,
  generateWeeklySummary,
  generateDailyBrief,
  MIN_SESSIONS_FOR_ANALYSIS,
  saveGrowthSnapshot,
} from '@/lib/growth-intelligence';
import { buildGrowthAnalysisInput } from '@/lib/growth-intelligence/input-builder';
import { calculateVelocity } from '@/lib/growth-intelligence/velocity.service';

export async function getFullGrowthIntelligence(userId: string) {
  // 1. Build the input for the current state
  const input = await buildGrowthAnalysisInput(userId, 8);
  
  // 2. Generate the current growth analysis
  const result = analyzeGrowth(input);
  
  // 3. Fetch historical snapshots
  let snapshots = await getGrowthSnapshotHistory(userId, { limit: 12 });

  // ── Retroactive snapshot generation ─────────────────────────────────────
  if ((!snapshots || snapshots.length === 0) && !result.meta.insufficientData) {
    const newSnapshot = await saveGrowthSnapshot(userId, result);
    snapshots = [newSnapshot];
  }

  if (!snapshots || snapshots.length === 0 || result.meta.insufficientData) {
    const completedRaw = result.meta.learningState?.workoutsCompleted ?? 0;
    const required = MIN_SESSIONS_FOR_ANALYSIS;
    const capped = Math.min(completedRaw, required);
    const progressPct = Math.min(100, Math.round((capped / required) * 100));

    const learningState = {
      status: result.meta.learningState?.status ?? 'learning',
      learningProgress: progressPct,
      workoutsCompleted: capped,
      workoutsRequired: required,
      estimatedUnlock: result.meta.learningState?.estimatedUnlock ?? '',
    };

    return {
      hasData: false,
      learningState,
      message: result.meta.insufficientDataReason || 'No growth data available yet. Log some workouts to generate your first analysis!',
    };
  }

  const latest = snapshots[0];
  const previous = snapshots.length > 1 ? snapshots[1] : undefined;

  // 4. Calculate Velocity
  let weeklyVelocity = 0;
  if (snapshots.length >= 2) {
    const v = calculateVelocity(snapshots);
    weeklyVelocity = v.weeklyGrowthRate;
  }

  // 5. Generate Muscle Intelligence
  const muscleIntelligence = analyseAllMuscles(input, snapshots);

  // 6. Generate Coach Analysis
  const readiness = generateTrainingReadiness(result, muscleIntelligence);
  const recoveryAdvice = generateRecoveryAdvice(readiness);
  const recommendations = generateCoachRecommendations(result);
  const summary = generateWeeklySummary(latest, previous, weeklyVelocity);
  const dailyBrief = generateDailyBrief(readiness, summary, muscleIntelligence);

  const coachAnalysis = {
    dailyBrief,
    weeklySummary: summary,
    recommendations,
    trainingReadiness: readiness,
    recoveryAdvice,
  };

  // 7. Generate Forecast
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 28); // +4 weeks
  const forecast = snapshots.length >= 2 ? forecastGrowthIndex(snapshots, targetDate) : null;

  // Serialize history to avoid Mongoose doc issues
  const history = snapshots.map(s => ({
    analyzedAt: s.analyzedAt,
    overallScore: s.overallScore.value,
    consistencyScore: s.consistencyScore.value,
    weeklyVolumeScore: s.weeklyVolumeScore.value,
    progressiveOverloadScore: s.progressiveOverloadScore.value,
    recoveryScore: s.recoveryScore.value,
    nutritionScore: s.nutritionScore.value,
  }));

  return {
    hasData: true,
    growthIndex: latest.overallScore.value,
    confidence: latest.overallConfidence * 100,
    velocity: weeklyVelocity,
    coachAnalysis,
    muscleIntelligence,
    forecast,
    history,
  };
}
