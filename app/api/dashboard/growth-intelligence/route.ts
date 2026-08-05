import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import {
  getGrowthSnapshotHistory,
  compareSnapshots,
  calculateVelocity,
  forecastGrowthIndex,
  analyzeGrowth,
  MIN_SESSIONS_FOR_ANALYSIS,
} from '@/lib/growth-intelligence';
import { buildGrowthAnalysisInput } from '@/lib/growth-intelligence/input-builder';
import { analyseAllMuscles } from '@/lib/growth-intelligence/muscle-analysis.service';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Build input and run the engine — the single source of truth for state.
    const input = await buildGrowthAnalysisInput(session.user.id, 8);
    const result = analyzeGrowth(input);

    // ── Derive a capped learning-state payload ──────────────────────────────
    // workoutsCompleted is capped at workoutsRequired so the UI never shows
    // values like "4 / 3".
    const completedRaw  = result.meta.learningState?.workoutsCompleted ?? 0;
    const required      = MIN_SESSIONS_FOR_ANALYSIS;
    const capped        = Math.min(completedRaw, required);
    const progressPct   = Math.min(100, Math.round((capped / required) * 100));

    const learningState = {
      status:            result.meta.learningState?.status ?? 'learning',
      learningProgress:  progressPct,
      workoutsCompleted: capped,
      workoutsRequired:  required,
      estimatedUnlock:   result.meta.learningState?.estimatedUnlock ?? '',
    } as const;

    // ── LEARNING — not enough data yet ─────────────────────────────────────
    if (result.meta.insufficientData) {
      return NextResponse.json({
        hasData: false,
        phase: 'LEARNING' as const,
        learningState,
        message:
          result.meta.insufficientDataReason ??
          'No growth data available yet. Keep training to generate your first analysis!',
      });
    }

    // ── Fetch snapshot history for comparison / velocity / forecast ─────────
    let snapshots = await getGrowthSnapshotHistory(session.user.id, { limit: 12 });

    // ── Retroactive snapshot generation ─────────────────────────────────────
    // If the user met the baseline requirement before the snapshot persistence
    // bug was fixed, they might have 0 snapshots but valid analysis data.
    if ((!snapshots || snapshots.length === 0) && !result.meta.insufficientData) {
      const { saveGrowthSnapshot } = await import('@/lib/growth-intelligence');
      const newSnapshot = await saveGrowthSnapshot(session.user.id, result);
      snapshots = [newSnapshot];
    }

    // ── Derive primary strength + weakest muscle from the muscle engine ─────
    const muscleAnalyses = analyseAllMuscles(input, snapshots ?? []);

    const trainedMuscles = muscleAnalyses.filter((m) => m.weeklySets > 0);

    const primaryStrength =
      trainedMuscles.length > 0
        ? [...trainedMuscles].sort(
            (a, b) => b.growthPotentialScore - a.growthPotentialScore,
          )[0].muscle
        : null;

    const weakestMuscleGroup =
      trainedMuscles.length > 0
        ? [...trainedMuscles].sort(
            (a, b) => a.growthPotentialScore - b.growthPotentialScore,
          )[0].muscle
        : null;

    // ── Comparison / velocity / forecast (require ≥ 2 snapshots) ───────────
    const hasEnoughSnapshots = (snapshots?.length ?? 0) >= 2;

    let comparison       = null;
    let velocity         = null;
    let forecast         = null;
    let topPositive: string | null      = null;
    let improvementArea: string | null  = null;

    if (hasEnoughSnapshots && snapshots) {
      const [latest, previous] = snapshots;
      comparison = compareSnapshots(latest, previous);

      const improvementHighlight = comparison.highlights.find(
        (h) => h.type === 'improvement',
      );
      if (improvementHighlight) topPositive = improvementHighlight.message;

      const regressionHighlight = comparison.highlights.find(
        (h) => h.type === 'regression',
      );
      if (regressionHighlight) improvementArea = regressionHighlight.message;

      velocity = calculateVelocity(snapshots);

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 28);
      forecast = forecastGrowthIndex(snapshots, targetDate);
    }

    // ── Determine phase: BASELINE_ESTABLISHED vs ONGOING_ANALYSIS ──────────
    // BASELINE_ESTABLISHED — user just crossed the threshold (≤ 1 snapshot).
    // ONGOING_ANALYSIS     — multiple snapshots exist; continuous tracking.
    const phase: 'BASELINE_ESTABLISHED' | 'ONGOING_ANALYSIS' =
      (snapshots?.length ?? 0) <= 1
        ? 'BASELINE_ESTABLISHED'
        : 'ONGOING_ANALYSIS';

    const latest = snapshots?.[0];

    return NextResponse.json({
      hasData: true,
      phase,
      learningState,
      growthIndex:  latest?.overallScore.value ?? result.overallGrowthScore.value,
      confidence:   (latest?.overallConfidence ?? result.meta.overallConfidence) * 100,
      weeklyTrend: comparison
        ? {
            direction: comparison.overall.trend,
            change:    comparison.overall.change,
          }
        : null,
      velocity: velocity ? velocity.weeklyGrowthRate : 0,
      forecast: forecast
        ? {
            projectedGI:           forecast.projectedGrowthIndex,
            weeksToNextMilestone:  forecast.estimatedWeeksToTarget,
          }
        : null,
      insights: {
        topPositive,
        improvementArea,
      },
      primaryStrength,
      weakestMuscleGroup,
    });
  } catch (error: unknown) {
    console.error('Error fetching growth intelligence dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch growth intelligence data' },
      { status: 500 },
    );
  }
}
