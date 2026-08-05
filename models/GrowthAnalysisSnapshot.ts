/**
 * @file GrowthAnalysisSnapshot.ts
 * @module models
 * @description
 *   Mongoose model for `growthSnapshots` — a dedicated collection that stores
 *   point-in-time captures of every `analyzeGrowth()` result.
 *
 *   ─── Why a dedicated collection? ─────────────────────────────────────────
 *   Snapshots are NOT embedded in the User document because:
 *     1. Growth analysis results can be large (per-exercise breakdowns, per-muscle
 *        arrays, insight strings, recommendations). Embedding them would balloon
 *        the User document on every analysis run.
 *     2. Historical analysis is a separate concern from user profile data.
 *        Querying "all snapshots for user X in the last 30 days" is a distinct
 *        access pattern best served by a dedicated collection with its own indexes.
 *     3. A standalone collection makes snapshot TTL policies, archival, or
 *        partitioning trivial to add in Phase 2+.
 *
 *   ─── Extensibility hooks ─────────────────────────────────────────────────
 *   Three `Mixed` fields at the root level are reserved for Phase 2+ use:
 *     • `physiqueMetrics`  — body weight log correlation, body fat %, measurements
 *     • `predictions`      — strength forecasts, body composition projections
 *     • `aiContext`        — AI model input feature vectors, LLM context payloads
 *
 *   These fields are absent in Phase 1 documents (Mongoose omits `undefined`
 *   from serialisation) but the schema is ready to receive them without a
 *   migration.
 *
 *   ─── Score sub-documents ─────────────────────────────────────────────────
 *   A single reusable `snapshotScoreSchema` is shared by every category
 *   (consistency, weekly volume, progressive overload, recovery, nutrition,
 *   overall). The `value` field is explicit and indexable; the `breakdown`
 *   field is `Mixed` to preserve arbitrary raw metrics at full fidelity.
 *
 *   ─── Indexes ─────────────────────────────────────────────────────────────
 *   `{ userId, analyzedAt }`           — primary time-series query
 *   `{ userId, overallScore.value }`   — peak score lookups
 *   `{ userId, engineVersion }`        — invalidate old-engine snapshots
 */

import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';
// Engine types (GrowthRecommendation, MuscleGrowthDetail, StrengthForecast,
// PlateauSignal) are referenced in JSDoc only — no import needed at runtime
// since these arrays are stored as Mixed and typed as unknown[] in the interface.

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Document Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shape of a single scored dimension within a snapshot.
 *
 * Mirrors `ScoreDetail` from the engine but replaces `breakdown?` (optional)
 * with `breakdown` (always present) so consumers never need a null-check.
 *
 * The `breakdown` object holds the raw metrics that produced the score, e.g.:
 *   consistency   → adherenceByWeek, completedWorkouts, plannedDaysPerWeek …
 *   weeklyVolume  → muscleBreakdown[], optimalSetsRange …
 *   overload      → exerciseBreakdown[], effectiveMinImprovementRate …
 *   recovery      → averageRecovery, sessionsWellRecovered …
 *   nutrition     → protein, calories, weightApplied …
 */
export interface ISnapshotScoreSubDoc {
  /** Numeric score clamped [0, 100]. Explicitly stored for trend queries. */
  value: number;
  /** Qualitative status bucket: critical | poor | fair | good | excellent */
  status: string;
  /** Numeric confidence [0, 1]. */
  confidence: number;
  /** Human-readable confidence tier. */
  confidenceLevel: string;
  /** Week-over-week trend: improving | stable | declining | insufficient_data */
  trend: string;
  /** One-line plain-English explanation. */
  explanation: string;
  /**
   * Raw metrics object from the scorer's `breakdown` field.
   * Stored as `Mixed` in Mongoose to handle varying structures per scorer
   * without schema explosion. Full fidelity for ML/AI feature extraction.
   */
  breakdown: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root Document Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single Growth Analysis Snapshot document.
 *
 * Represents the complete output of one `analyzeGrowth()` run, captured at
 * a specific point in time for a specific user. Multiple snapshots per user
 * form the time-series used for trend analysis and plateau detection.
 */
export interface IGrowthAnalysisSnapshot extends Document {
  // ── Ownership & provenance ─────────────────────────────────────────────────
  /** Reference to the user who owns this snapshot. */
  userId: Types.ObjectId;
  /** ISO timestamp of when the analysis engine computed this result. */
  analyzedAt: Date;
  /** Start of the analysis window (inclusive). */
  windowStart: Date;
  /** End of the analysis window (inclusive). */
  windowEnd: Date;
  /** Engine version that produced this snapshot. Used for cache invalidation. */
  engineVersion: string;

  // ── Score dimensions ───────────────────────────────────────────────────────
  /** Composite weighted Growth Score. */
  overallScore: ISnapshotScoreSubDoc;
  /** Adherence to the planned workout schedule. */
  consistencyScore: ISnapshotScoreSubDoc;
  /** Weekly training volume per muscle group vs. optimal ranges. */
  weeklyVolumeScore: ISnapshotScoreSubDoc;
  /** Rate and quality of load/volume progression across exercises. */
  progressiveOverloadScore: ISnapshotScoreSubDoc;
  /** Quality of inter-session muscle recovery. */
  recoveryScore: ISnapshotScoreSubDoc;
  /** Alignment of nutrition intake with training demands. */
  nutritionScore: ISnapshotScoreSubDoc;

  // ── Coaching layer ─────────────────────────────────────────────────────────
  /** Priority-ordered coaching insight strings. */
  insights: string[];
  /**
   * Prioritised, actionable coaching recommendations (max 5).
   * Stored as `unknown[]` (Mixed) to accommodate future AI recommendation shapes.
   * Cast to `GrowthRecommendation[]` at call sites when Phase 1 shape is expected.
   */
  recommendations: unknown[];

  // ── Muscle & strength detail (Phase 1: empty arrays) ──────────────────────
  /**
   * Per-muscle growth potential assessments.
   * Stored as `unknown[]` (Mixed) — Phase 2 will expand the `MuscleGrowthDetail` shape.
   * Cast to `MuscleGrowthDetail[]` at call sites when needed.
   * Phase 1: [].
   */
  muscleDetails: unknown[];
  /**
   * Per-exercise strength projections.
   * Stored as `unknown[]` (Mixed) — Phase 2 will expand `StrengthForecast`.
   * Phase 1: [].
   */
  strengthForecasts: unknown[];
  /**
   * Detected training plateaus.
   * Stored as `unknown[]` (Mixed) — Phase 2 will expand `PlateauSignal`.
   * Phase 1: [].
   */
  plateauSignals: unknown[];

  // ── Data quality ───────────────────────────────────────────────────────────
  /** Number of completed sessions included in the analysis. */
  sessionsAnalyzed: number;
  /** Number of unique training days within the analysis window. */
  trainingDaysAnalyzed: number;
  /** Overall confidence [0, 1] — weakest-link across all sub-scores. */
  overallConfidence: number;
  /** Human-readable confidence tier. */
  overallConfidenceLevel: string;
  /** True when data is insufficient for meaningful scores. */
  insufficientData: boolean;
  /** Explanation when `insufficientData` is true. Null otherwise. */
  insufficientDataReason: string | null;

  // ── Phase 2+ extension hooks (reserved, undefined in Phase 1) ─────────────
  /**
   * Physique metrics correlated with this analysis window.
   * Phase 2+: body weight trend, body fat %, tape measurements.
   * Schema: open-ended Mixed to accommodate any physique tracking format.
   */
  physiqueMetrics?: Record<string, unknown>;
  /**
   * Forward-looking predictions tied to this snapshot.
   * Phase 2+: strength 1RM projections, body composition forecasts,
   * training load recommendations for the next N weeks.
   */
  predictions?: Record<string, unknown>;
  /**
   * AI model context for this snapshot.
   * Phase 3+: feature vectors for coaching models, LLM prompt context,
   * embedding vectors for semantic similarity across snapshots.
   */
  aiContext?: Record<string, unknown>;

  // ── Mongoose timestamps ────────────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Document Schema — Reused for Every Score Category
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared schema for every score dimension.
 *
 * `_id: false` — these are value objects, not entities. They don't need their
 * own MongoDB ObjectId, which saves space and removes confusing nested `_id`s
 * from the API response.
 *
 * `breakdown` uses `Schema.Types.Mixed` to store the raw metric payload from
 * each scorer without imposing a schema on its varying structure. Mongoose
 * serialises this as a plain JSON object.
 */
const snapshotScoreSchema = new Schema<ISnapshotScoreSubDoc>(
  {
    value:          { type: Number, required: true, min: 0, max: 100 },
    status:         { type: String, required: true },
    confidence:     { type: Number, required: true, min: 0, max: 1 },
    confidenceLevel: { type: String, required: true },
    trend:          { type: String, required: true },
    explanation:    { type: String, required: true },
    breakdown:      { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// Root Document Schema
// ─────────────────────────────────────────────────────────────────────────────

const growthAnalysisSnapshotSchema = new Schema<IGrowthAnalysisSnapshot>(
  {
    // ── Ownership & provenance ───────────────────────────────────────────────
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    analyzedAt: {
      type:     Date,
      required: true,
    },
    windowStart: {
      type:     Date,
      required: true,
    },
    windowEnd: {
      type:     Date,
      required: true,
    },
    engineVersion: {
      type:     String,
      required: true,
      trim:     true,
    },

    // ── Score dimensions (reuse snapshotScoreSchema) ─────────────────────────
    overallScore:             { type: snapshotScoreSchema, required: true },
    consistencyScore:         { type: snapshotScoreSchema, required: true },
    weeklyVolumeScore:        { type: snapshotScoreSchema, required: true },
    progressiveOverloadScore: { type: snapshotScoreSchema, required: true },
    recoveryScore:            { type: snapshotScoreSchema, required: true },
    nutritionScore:           { type: snapshotScoreSchema, required: true },

    // ── Coaching layer ───────────────────────────────────────────────────────
    insights: {
      type:    [String],
      default: [],
    },
    /**
     * Stored as Mixed array so future AI recommendation shapes (which may
     * differ from the current `GrowthRecommendation` interface) can be
     * appended without a schema migration.
     */
    recommendations: {
      type:    [Schema.Types.Mixed],
      default: [],
    },

    // ── Muscle & strength detail ─────────────────────────────────────────────
    /** Mixed array — MuscleGrowthDetail shape will expand in Phase 2. */
    muscleDetails: {
      type:    [Schema.Types.Mixed],
      default: [],
    },
    /** Mixed array — StrengthForecast shape will expand in Phase 2. */
    strengthForecasts: {
      type:    [Schema.Types.Mixed],
      default: [],
    },
    /** Mixed array — PlateauSignal shape will expand in Phase 2. */
    plateauSignals: {
      type:    [Schema.Types.Mixed],
      default: [],
    },

    // ── Data quality ─────────────────────────────────────────────────────────
    sessionsAnalyzed: {
      type:     Number,
      required: true,
      min:      0,
    },
    trainingDaysAnalyzed: {
      type:     Number,
      required: true,
      min:      0,
    },
    overallConfidence: {
      type:     Number,
      required: true,
      min:      0,
      max:      1,
    },
    overallConfidenceLevel: {
      type:     String,
      required: true,
    },
    insufficientData: {
      type:     Boolean,
      required: true,
      default:  false,
    },
    insufficientDataReason: {
      type:    String,
      default: null,
    },

    // ── Phase 2+ extension hooks ─────────────────────────────────────────────
    physiqueMetrics: {
      type: Schema.Types.Mixed,
      // Not required — absent in Phase 1 documents.
    },
    predictions: {
      type: Schema.Types.Mixed,
    },
    aiContext: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'growthSnapshots',
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Primary time-series index.
 * Powers: "get all snapshots for user X, most recent first".
 * Used by `getGrowthSnapshotHistory()` and trend charts.
 */
growthAnalysisSnapshotSchema.index({ userId: 1, analyzedAt: -1 });

/**
 * Peak score lookup index.
 * Powers: "what was this user's best overall growth score?" and
 *         "how many users have reached 80+ score?" (aggregate queries).
 */
growthAnalysisSnapshotSchema.index({ userId: 1, 'overallScore.value': -1 });

/**
 * Engine version index.
 * Powers: "find all snapshots produced by engine < 2.0.0 for re-scoring".
 * Essential when the scoring algorithm changes materially and historical
 * snapshots need to be invalidated or re-computed in batch.
 */
growthAnalysisSnapshotSchema.index({ userId: 1, engineVersion: 1 });

// ─────────────────────────────────────────────────────────────────────────────
// Model Registration
// ─────────────────────────────────────────────────────────────────────────────

const GrowthAnalysisSnapshot: Model<IGrowthAnalysisSnapshot> =
  mongoose.models.GrowthAnalysisSnapshot ??
  mongoose.model<IGrowthAnalysisSnapshot>(
    'GrowthAnalysisSnapshot',
    growthAnalysisSnapshotSchema,
  );

export default GrowthAnalysisSnapshot;
