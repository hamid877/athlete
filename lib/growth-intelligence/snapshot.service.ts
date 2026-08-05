/**
 * @file snapshot.service.ts
 * @module lib/growth-intelligence
 * @description
 *   Snapshot Service — persists and retrieves Growth Analysis snapshots from
 *   the `growthSnapshots` MongoDB collection.
 *
 *   ─── Responsibilities ────────────────────────────────────────────────────
 *   This service owns exactly one concern: mapping a `GrowthAnalysisResult`
 *   (the pure-TS engine output) to a `GrowthAnalysisSnapshot` Mongoose document
 *   and persisting it. No calculation logic lives here.
 *
 *   ─── Caller contract ─────────────────────────────────────────────────────
 *   Callers MUST call `connectDB()` before invoking any function in this
 *   module. This service intentionally does NOT open its own DB connection —
 *   the same convention followed by every other service in this project.
 *
 *   ─── Public surface ──────────────────────────────────────────────────────
 *   saveGrowthSnapshot        — persist a full GrowthAnalysisResult
 *   getLatestGrowthSnapshot   — fetch the most recent snapshot for a user
 *   getGrowthSnapshotHistory  — paginated snapshot history
 *
 *   ─── Why snapshot-based storage? ─────────────────────────────────────────
 *   See the architectural note at the bottom of this file.
 */

import GrowthAnalysisSnapshot from '@/models/GrowthAnalysisSnapshot';
import type { IGrowthAnalysisSnapshot, ISnapshotScoreSubDoc } from '@/models/GrowthAnalysisSnapshot';
import type { GrowthAnalysisResult, ScoreDetail } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum number of snapshots returned by `getGrowthSnapshotHistory`. */
const MAX_HISTORY_LIMIT = 52; // 1 full year of weekly snapshots

/** Default number of snapshots returned when no limit is specified. */
const DEFAULT_HISTORY_LIMIT = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Internal Mapping Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a `ScoreDetail` from the engine to the flat `ISnapshotScoreSubDoc`
 * shape expected by the Mongoose model.
 *
 * The `breakdown` field is preserved at full fidelity. When the engine returns
 * `breakdown: undefined` (e.g. insufficient-data path), we default to `{}`
 * so the stored document always has a defined breakdown object.
 *
 * @internal
 */
function mapScoreDetail(detail: ScoreDetail): ISnapshotScoreSubDoc {
  return {
    value:           detail.value,
    status:          detail.status,
    confidence:      detail.confidence,
    confidenceLevel: detail.confidenceLevel,
    trend:           detail.trend,
    explanation:     detail.explanation,
    breakdown:       detail.breakdown ?? {},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persists a complete `GrowthAnalysisResult` as a snapshot document.
 *
 * This is the primary write operation. It should be called by the API route
 * (or a background job) immediately after `analyzeGrowth()` completes so
 * that no result is lost.
 *
 * The function performs a pure mapping of the engine output — no calculations,
 * no validation, no transformation beyond field renaming.
 *
 * @param userId  - MongoDB ObjectId string of the authenticated user.
 * @param result  - The complete `GrowthAnalysisResult` returned by `analyzeGrowth()`.
 * @returns The saved Mongoose document (includes `_id`, `createdAt`, `updatedAt`).
 *
 * @example
 * ```ts
 * await connectDB();
 * const result = analyzeGrowth(input);
 * const snapshot = await saveGrowthSnapshot(userId, result);
 * console.log(snapshot._id);        // new ObjectId
 * console.log(snapshot.analyzedAt); // Date
 * ```
 */
export async function saveGrowthSnapshot(
  userId: string,
  result: GrowthAnalysisResult,
): Promise<IGrowthAnalysisSnapshot> {
  const doc = await GrowthAnalysisSnapshot.create({
    userId,

    // ── Provenance ────────────────────────────────────────────────────────────
    // `meta.computedAt` is already an ISO string from the engine.
    analyzedAt:    new Date(result.meta.computedAt),
    windowStart:   new Date(result.meta.windowStart),
    windowEnd:     new Date(result.meta.windowEnd),
    engineVersion: result.meta.engineVersion,

    // ── Score dimensions ──────────────────────────────────────────────────────
    overallScore:             mapScoreDetail(result.overallGrowthScore),
    consistencyScore:         mapScoreDetail(result.consistencyScore),
    weeklyVolumeScore:        mapScoreDetail(result.weeklyVolumeScore),
    progressiveOverloadScore: mapScoreDetail(result.progressiveOverloadScore),
    recoveryScore:            mapScoreDetail(result.recoveryScore),
    nutritionScore:           mapScoreDetail(result.nutritionScore),

    // ── Coaching layer ────────────────────────────────────────────────────────
    insights:        result.insights,
    recommendations: result.recommendations,

    // ── Muscle & strength detail (Phase 1: empty arrays) ─────────────────────
    muscleDetails:     result.muscleDetails,
    strengthForecasts: result.strengthForecasts,
    plateauSignals:    result.plateauSignals,

    // ── Data quality ──────────────────────────────────────────────────────────
    sessionsAnalyzed:       result.meta.sessionsAnalyzed,
    trainingDaysAnalyzed:   result.meta.trainingDaysAnalyzed,
    overallConfidence:      result.meta.overallConfidence,
    overallConfidenceLevel: result.meta.overallConfidenceLevel,
    insufficientData:       result.meta.insufficientData,
    insufficientDataReason: result.meta.insufficientDataReason,

    // ── Phase 2+ extension hooks: omitted in Phase 1 ─────────────────────────
    // physiqueMetrics, predictions, aiContext are intentionally absent here.
    // Mongoose omits undefined fields from the stored document, so the
    // schema is future-ready without any null placeholders cluttering the DB.
  });

  return doc;
}

/**
 * Retrieves the most recent snapshot for a user.
 *
 * Returns `null` when no snapshots exist yet (e.g. first-time user).
 * The caller should show an "onboarding / run your first analysis" state
 * in this case.
 *
 * @param userId - MongoDB ObjectId string of the authenticated user.
 * @returns The latest `IGrowthAnalysisSnapshot` document, or `null`.
 *
 * @example
 * ```ts
 * await connectDB();
 * const latest = await getLatestGrowthSnapshot(userId);
 * if (!latest) {
 *   // No analysis has been saved yet.
 * } else {
 *   console.log(latest.overallScore.value);
 * }
 * ```
 */
export async function getLatestGrowthSnapshot(
  userId: string,
): Promise<IGrowthAnalysisSnapshot | null> {
  return GrowthAnalysisSnapshot.findOne({ userId })
    .sort({ analyzedAt: -1 })
    .exec();
}

/**
 * Options for filtering and paginating snapshot history.
 */
export interface SnapshotHistoryOptions {
  /**
   * Maximum number of snapshots to return.
   * Default: 10  |  Max: 52 (one year of weekly snapshots).
   */
  limit?: number;

  /**
   * Number of documents to skip (for offset-based pagination).
   * Default: 0.
   */
  skip?: number;

  /**
   * Return only snapshots strictly after this date.
   * Useful for fetching new snapshots since the last poll.
   */
  after?: Date;

  /**
   * Return only snapshots strictly before this date.
   * Useful for fetching a historical range.
   */
  before?: Date;
}

/**
 * Retrieves a paginated list of snapshots for a user, sorted most-recent-first.
 *
 * Designed for:
 *   – Trend charts (fetch last N snapshots and plot `overallScore.value`)
 *   – Plateau detection (compare `progressiveOverloadScore.value` across time)
 *   – Dashboard history feeds (show last 5–10 analysis runs)
 *   – ML feature pipelines (stream all snapshots for a user)
 *
 * @param userId  - MongoDB ObjectId string of the authenticated user.
 * @param options - Optional filters and pagination controls.
 * @returns Array of snapshot documents, most recent first.
 *
 * @example
 * ```ts
 * await connectDB();
 *
 * // Last 12 weekly snapshots (≈ 3 months of trend data)
 * const history = await getGrowthSnapshotHistory(userId, { limit: 12 });
 *
 * // Snapshots in a specific date range
 * const q1 = await getGrowthSnapshotHistory(userId, {
 *   after:  new Date('2025-01-01'),
 *   before: new Date('2025-04-01'),
 * });
 * ```
 */
export async function getGrowthSnapshotHistory(
  userId: string,
  options: SnapshotHistoryOptions = {},
): Promise<IGrowthAnalysisSnapshot[]> {
  const {
    limit  = DEFAULT_HISTORY_LIMIT,
    skip   = 0,
    after,
    before,
  } = options;

  const clampedLimit = Math.min(Math.max(1, limit), MAX_HISTORY_LIMIT);

  // Build the date range filter for `analyzedAt` only when bounds are provided.
  const dateFilter: { $gt?: Date; $lt?: Date } = {};
  if (after)  dateFilter.$gt = after;
  if (before) dateFilter.$lt = before;
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const filter: { userId: string; analyzedAt?: typeof dateFilter } = { userId };
  if (hasDateFilter) filter.analyzedAt = dateFilter;

  return GrowthAnalysisSnapshot.find(filter)
    .sort({ analyzedAt: -1 })
    .skip(skip)
    .limit(clampedLimit)
    .exec();
}

// ─────────────────────────────────────────────────────────────────────────────
// Architectural Note — Why Snapshot-Based Storage?
// ─────────────────────────────────────────────────────────────────────────────
//
// ── The problem with on-demand recalculation ─────────────────────────────────
//
// An alternative architecture would recalculate growth scores on every API
// request from raw WorkoutSession documents. This has several problems:
//
//   1. COST — The growth engine runs 5 scorers, each of which iterates over
//      every session in the analysis window. A user with 200 sessions and a
//      26-week window would rerun O(n²) recovery calculations on every page load.
//
//   2. INCONSISTENCY — If the user logs a session between two API calls, the
//      growth score would silently change. Snapshots give a stable, auditable
//      record of "what the engine said at this moment in time."
//
//   3. TREND BLINDNESS — You cannot compare "score this week vs. last week"
//      without storing historical scores. Recalculation can only produce the
//      current result; it cannot reconstruct the past.
//
// ── How snapshots enable future features ─────────────────────────────────────
//
//   TREND ANALYSIS
//     Query `{ userId, analyzedAt: { $gte: 8weeksAgo } }`, extract
//     `overallScore.value` per snapshot → instant time-series for charting
//     without any recalculation.
//
//   PLATEAU DETECTION
//     Compare `progressiveOverloadScore.value` and
//     `progressiveOverloadScore.breakdown.exercises[].slope` across N consecutive
//     snapshots. A flat or declining slope over 3+ snapshots is a plateau.
//     This cross-snapshot comparison is impossible without stored history.
//
//   PREDICTION FEATURES (Phase 2+)
//     Use `overallScore.value` time-series as input features to a linear
//     regression or LSTM model. Store the resulting prediction in
//     `snapshot.predictions` for display and accuracy tracking over time.
//
//   AI COACHING CONTEXT (Phase 3+)
//     Feed the last N snapshots' `breakdown` fields into an LLM as structured
//     context: "Here are your last 8 weeks of training metrics...". Store the
//     generated coaching narrative back into `aiContext` for offline inspection.
//
//   ENGINE VERSION MANAGEMENT
//     When the scoring algorithm changes in Phase 2, use the `engineVersion`
//     index to find and re-score old snapshots in a background migration job.
//     New snapshots use the new engine; old ones can be lazily re-scored.
//
//   PHYSIQUE CORRELATION (Phase 2+)
//     Join snapshot `analyzedAt` with weight log entries to populate
//     `physiqueMetrics`. A machine learning model can then correlate
//     "training quality score × nutrition score → body composition change".
