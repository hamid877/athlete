/**
 * @file comparison.service.ts
 * @module lib/growth-intelligence
 * @description
 *   Snapshot Comparison Service — computes structured, strongly typed diffs
 *   between two `GrowthAnalysisSnapshot` documents.
 *
 *   ─── Responsibilities ────────────────────────────────────────────────────
 *   This service is a pure computation layer. It accepts two persisted
 *   snapshots (the model does the DB work) and produces a `SnapshotComparison`
 *   that describes how every tracked dimension changed between them.
 *
 *   No scoring logic lives here — all numeric values are taken directly from
 *   the snapshot documents and processed with arithmetic only.
 *   No DB calls. No I/O. Every public function is deterministic and testable.
 *
 *   ─── Public surface ──────────────────────────────────────────────────────
 *   Enums:
 *     TrendDirection   — improving | stable | declining | insufficient_data
 *     ChangeSeverity   — significant | moderate | minor | negligible
 *
 *   Functions:
 *     compareSnapshots    — orchestrator: diffs all 7 dimensions at once
 *     compareMetric       — computes one MetricComparison from two numbers
 *     classifyTrend       — maps a numeric delta → TrendDirection
 *     classifySeverity    — maps a percentage delta → ChangeSeverity
 *     identifyHighlights  — extracts the most notable changes
 *     generateSummary     — produces counts, extremes, and a narrative string
 *
 *   ─── Naming note ─────────────────────────────────────────────────────────
 *   `TrendDirection` here is a TypeScript `enum` (runtime value + type).
 *   The Growth Analysis engine exports a string-union `type TrendDirection`
 *   from `./types`. These are distinct module-level declarations that coexist
 *   safely. The barrel (`index.ts`) re-exports this enum as
 *   `ComparisonTrendDirection` to avoid a name collision in consumer imports.
 */

import type { IGrowthAnalysisSnapshot, ISnapshotScoreSubDoc } from '@/models/GrowthAnalysisSnapshot';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Directional classification of a metric change between two snapshots.
 *
 * Unlike the engine's `TrendDirection` string-union (which describes week-over-
 * week trends *within* a single analysis window), this enum describes the
 * direction of change *between* two persisted snapshot documents.
 *
 * `InsufficientData` is set when either snapshot has `confidenceLevel =
 * 'insufficient'`, meaning the underlying score is not reliable enough to
 * draw a directional conclusion.
 */
export enum TrendDirection {
  Improving        = 'improving',
  Stable           = 'stable',
  Declining        = 'declining',
  InsufficientData = 'insufficient_data',
}

/**
 * Magnitude tier for a metric change, based on its percentage delta.
 *
 * Thresholds (absolute % change):
 *   ≥ 20%  Significant — notable; likely warrants user action or attention
 *   ≥ 10%  Moderate    — meaningful shift worth monitoring
 *   ≥  5%  Minor       — small but real; show with lower visual weight
 *   <  5%  Negligible  — within week-to-week noise; generally not surfaced
 */
export enum ChangeSeverity {
  Significant = 'significant',
  Moderate    = 'moderate',
  Minor       = 'minor',
  Negligible  = 'negligible',
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The result of comparing a single metric between two snapshots.
 *
 * All numeric fields are rounded to eliminate floating-point noise:
 *   `current` / `previous` / `change`  — 2 decimal places
 *   `percentageChange`                  — 1 decimal place
 */
export interface MetricComparison {
  /** Value of this metric in the newer (current) snapshot. */
  current: number;
  /** Value of this metric in the older (previous) snapshot. */
  previous: number;
  /**
   * Absolute delta: `current − previous`.
   * Positive = improved, negative = declined.
   */
  change: number;
  /**
   * Relative delta as a percentage of the previous value:
   * `(change / previous) × 100`.
   * `0` when `previous = 0` (avoids division by zero).
   */
  percentageChange: number;
  /** Directional classification of the delta. */
  trend: TrendDirection;
  /** Magnitude classification based on `percentageChange`. */
  severity: ChangeSeverity;
  /** Shorthand: `true` when `change > 0`. */
  improved: boolean;
}

/**
 * A single notable change surfaced by `identifyHighlights()`.
 */
export interface ComparisonHighlight {
  /** Human-readable dimension name (e.g. "Consistency"). */
  dimension: string;
  /** Whether this highlight represents an improvement or regression. */
  type: 'improvement' | 'regression';
  /** Absolute point change (same as `MetricComparison.change`). */
  change: number;
  /** Percentage change (same as `MetricComparison.percentageChange`). */
  percentageChange: number;
  /** Severity of this change. Only Minor, Moderate, or Significant appear. */
  severity: ChangeSeverity;
  /** Plain-English summary sentence ready for display. */
  message: string;
}

/**
 * High-level summary of the comparison across all dimensions.
 */
export interface ComparisonSummary {
  /** Direction of the overall Growth Intelligence score change. */
  overallTrend: TrendDirection;
  /** Number of dimensions that improved (TrendDirection.Improving). */
  improvedDimensions: number;
  /** Number of dimensions that declined (TrendDirection.Declining). */
  declinedDimensions: number;
  /**
   * Number of dimensions that stayed flat or had insufficient data.
   * (TrendDirection.Stable | TrendDirection.InsufficientData)
   */
  stableDimensions: number;
  /**
   * Label of the dimension with the largest positive change.
   * `null` when no dimension improved.
   */
  mostImproved: string | null;
  /**
   * Label of the dimension with the largest negative change.
   * `null` when no dimension declined.
   */
  mostDeclined: string | null;
  /** Rule-based narrative string describing the overall comparison result. */
  narrative: string;
}

/**
 * Provenance of the comparison (which two snapshots were compared).
 */
export interface ComparisonMeta {
  /** `_id` of the newer snapshot (as string). */
  currentSnapshotId: string;
  /** `_id` of the older snapshot (as string). */
  previousSnapshotId: string;
  /** Timestamp of the newer snapshot. */
  currentAnalyzedAt: Date;
  /** Timestamp of the older snapshot. */
  previousAnalyzedAt: Date;
  /**
   * Elapsed calendar days between the two snapshots.
   * Rounded to the nearest whole day.
   */
  daysBetween: number;
}

/**
 * The complete result of comparing two `GrowthAnalysisSnapshot` documents.
 *
 * @example
 * ```ts
 * const [current, previous] = await getGrowthSnapshotHistory(userId, { limit: 2 });
 * const comparison = compareSnapshots(current, previous);
 *
 * // Access a dimension comparison
 * console.log(comparison.consistency.change);        // +5.0
 * console.log(comparison.consistency.trend);         // TrendDirection.Improving
 *
 * // Show the highest-impact highlights
 * comparison.highlights.forEach(h => console.log(h.message));
 *
 * // Read the narrative
 * console.log(comparison.summary.narrative);
 * ```
 */
export interface SnapshotComparison {
  /** Composite Growth Intelligence score comparison. */
  overall: MetricComparison;
  /** Workout schedule adherence comparison. */
  consistency: MetricComparison;
  /** Training volume per muscle group comparison. */
  weeklyVolume: MetricComparison;
  /** Load/volume progression across exercises comparison. */
  progressiveOverload: MetricComparison;
  /** Inter-session recovery quality comparison. */
  recovery: MetricComparison;
  /**
   * Protein and calorie alignment comparison.
   * Confidence is often InsufficientData when nutrition is not tracked.
   */
  nutrition: MetricComparison;
  /**
   * Overall analysis confidence comparison.
   * Scaled to [0, 100] for consistency with score metrics.
   */
  confidence: MetricComparison;
  /** Up to 4 notable changes (max 2 improvements, max 2 regressions). */
  highlights: ComparisonHighlight[];
  /** Counts, extremes, and narrative for the overall comparison. */
  summary: ComparisonSummary;
  /** Which two snapshots were compared and when. */
  meta: ComparisonMeta;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The seven compared metric dimensions — the core of `SnapshotComparison`
 * without the derived `highlights`, `summary`, and `meta` fields.
 *
 * Used as the parameter type for `identifyHighlights` and `generateSummary`
 * so they are testable in isolation without needing the full assembled result.
 */
export type MetricDimensions = Omit<SnapshotComparison, 'highlights' | 'summary' | 'meta'>;

/** Internal entry used when iterating over all dimensions. */
interface DimensionEntry {
  key: keyof MetricDimensions;
  label: string;
  comparison: MetricComparison;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score-point change within ±STABLE_CHANGE_THRESHOLD is classified as 'stable'.
 *
 * A 2-point swing on a 0–100 scale is within the expected week-to-week
 * noise from small changes in session count or exercise variety. Classifying
 * anything smaller as a directional change would produce false signals.
 */
const STABLE_CHANGE_THRESHOLD = 2;

/**
 * Absolute-percentage-change thresholds for severity classification.
 *
 * Derived from common UX conventions for fitness metrics:
 *   ≥ 20%  Significant — roughly ≥ 14 points on a 70-baseline score
 *   ≥ 10%  Moderate    — roughly ≥  7 points
 *   ≥  5%  Minor       — roughly ≥  3.5 points
 */
const SEVERITY_PCT = {
  significant: 20,
  moderate:    10,
  minor:        5,
} as const;

/** Maximum highlight entries per type (improvement / regression). */
const MAX_HIGHLIGHTS_PER_TYPE = 2;

/** Confidence level string that signals insufficient data. */
const INSUFFICIENT_LEVEL = 'insufficient';

/** Milliseconds per calendar day. */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Human-readable label for each metric dimension, keyed by field name. */
const DIMENSION_LABELS: Record<keyof MetricDimensions, string> = {
  overall:             'Overall Growth Intelligence',
  consistency:         'Consistency',
  weeklyVolume:        'Weekly Volume',
  progressiveOverload: 'Progressive Overload',
  recovery:            'Recovery',
  nutrition:           'Nutrition',
  confidence:          'Confidence',
};

// ─────────────────────────────────────────────────────────────────────────────
// Public Core Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classifies the directional trend of a numeric change.
 *
 * Changes within ±STABLE_CHANGE_THRESHOLD are considered stable noise.
 * Use the `hasInsufficientData` parameter in `compareMetric` to force
 * `InsufficientData` when the underlying scores are unreliable.
 *
 * @param change - Absolute delta (current − previous).
 * @returns `TrendDirection.Improving`, `Stable`, or `Declining`.
 */
export function classifyTrend(change: number): TrendDirection {
  if (change > STABLE_CHANGE_THRESHOLD)  return TrendDirection.Improving;
  if (change < -STABLE_CHANGE_THRESHOLD) return TrendDirection.Declining;
  return TrendDirection.Stable;
}

/**
 * Classifies the magnitude of a percentage change into a severity tier.
 *
 * Input is the signed percentage change; the function operates on its
 * absolute value so both improvements and regressions are classified
 * using the same thresholds.
 *
 * @param percentageChange - Signed percentage change.
 * @returns A `ChangeSeverity` tier.
 */
export function classifySeverity(percentageChange: number): ChangeSeverity {
  const abs = Math.abs(percentageChange);
  if (abs >= SEVERITY_PCT.significant) return ChangeSeverity.Significant;
  if (abs >= SEVERITY_PCT.moderate)    return ChangeSeverity.Moderate;
  if (abs >= SEVERITY_PCT.minor)       return ChangeSeverity.Minor;
  return ChangeSeverity.Negligible;
}

/**
 * Computes a `MetricComparison` for a single numeric metric.
 *
 * This is the lowest-level comparison primitive. All higher-level comparison
 * functions (`compareSnapshots`, `identifyHighlights`, `generateSummary`)
 * are built on top of calls to this function.
 *
 * Numeric results are rounded to eliminate floating-point noise:
 *   `current`, `previous`, `change`  → 2 decimal places
 *   `percentageChange`                → 1 decimal place
 *
 * @param currentValue        - Metric value in the newer snapshot.
 * @param previousValue       - Metric value in the older snapshot.
 * @param hasInsufficientData - When `true`, `trend` is forced to
 *   `TrendDirection.InsufficientData` regardless of the numeric delta.
 *   Pass `true` when either snapshot's `confidenceLevel` is `'insufficient'`.
 * @returns A fully typed `MetricComparison`.
 */
export function compareMetric(
  currentValue: number,
  previousValue: number,
  hasInsufficientData: boolean = false,
): MetricComparison {
  const change           = currentValue - previousValue;
  const percentageChange = previousValue !== 0
    ? (change / previousValue) * 100
    : 0;

  const trend    = hasInsufficientData
    ? TrendDirection.InsufficientData
    : classifyTrend(change);
  const severity = classifySeverity(percentageChange);
  const improved = change > 0;

  return {
    current:          round2(currentValue),
    previous:         round2(previousValue),
    change:           round2(change),
    percentageChange: round1(percentageChange),
    trend,
    severity,
    improved,
  };
}

/**
 * Identifies the most notable changes across all metric dimensions.
 *
 * Selection rules:
 *   1. Changes with `severity = Negligible` are excluded.
 *   2. Dimensions with `trend = InsufficientData` are excluded.
 *   3. At most `MAX_HIGHLIGHTS_PER_TYPE` (2) highlights per type.
 *   4. Improvements are sorted by change descending (largest gain first).
 *   5. Regressions are sorted by change ascending (largest loss first).
 *   6. Improvements are listed before regressions in the output array.
 *
 * @param dimensions - The seven computed metric dimensions.
 * @returns An ordered list of notable changes, max 4 entries.
 */
export function identifyHighlights(
  dimensions: MetricDimensions,
): ComparisonHighlight[] {
  const entries = buildDimensionEntries(dimensions);

  const improvements = entries
    .filter(
      (e) =>
        e.comparison.trend === TrendDirection.Improving &&
        e.comparison.severity !== ChangeSeverity.Negligible,
    )
    .sort((a, b) => b.comparison.change - a.comparison.change)
    .slice(0, MAX_HIGHLIGHTS_PER_TYPE);

  const regressions = entries
    .filter(
      (e) =>
        e.comparison.trend === TrendDirection.Declining &&
        e.comparison.severity !== ChangeSeverity.Negligible,
    )
    .sort((a, b) => a.comparison.change - b.comparison.change) // most negative first
    .slice(0, MAX_HIGHLIGHTS_PER_TYPE);

  return [
    ...improvements.map((e) => toHighlight(e, 'improvement')),
    ...regressions.map((e)  => toHighlight(e, 'regression')),
  ];
}

/**
 * Generates a structured summary of the overall comparison.
 *
 * This function is deterministic: the same `dimensions` input always produces
 * the same output. Call it after `compareMetric` for each dimension and pass
 * the assembled `MetricDimensions` map.
 *
 * @param dimensions - The seven computed metric dimensions.
 * @returns A `ComparisonSummary` with counts, extremes, and a narrative.
 */
export function generateSummary(
  dimensions: MetricDimensions,
): ComparisonSummary {
  const entries = buildDimensionEntries(dimensions);

  const improved = entries.filter(
    (e) => e.comparison.trend === TrendDirection.Improving,
  );
  const declined = entries.filter(
    (e) => e.comparison.trend === TrendDirection.Declining,
  );
  const stable   = entries.filter(
    (e) =>
      e.comparison.trend === TrendDirection.Stable ||
      e.comparison.trend === TrendDirection.InsufficientData,
  );

  // Dimension with the single largest positive / negative change
  const mostImprovedEntry = improved.length > 0
    ? improved.reduce((best, curr) =>
        curr.comparison.change > best.comparison.change ? curr : best
      )
    : null;

  const mostDeclinedEntry = declined.length > 0
    ? declined.reduce((worst, curr) =>
        curr.comparison.change < worst.comparison.change ? curr : worst
      )
    : null;

  return {
    overallTrend:       dimensions.overall.trend,
    improvedDimensions: improved.length,
    declinedDimensions: declined.length,
    stableDimensions:   stable.length,
    mostImproved:       mostImprovedEntry?.label ?? null,
    mostDeclined:       mostDeclinedEntry?.label ?? null,
    narrative:          buildNarrative(dimensions.overall, improved.length, entries.length),
  };
}

/**
 * Compares two snapshots across all seven tracked dimensions and returns a
 * complete, strongly typed `SnapshotComparison`.
 *
 * The function assumes `current` is chronologically newer than `previous`.
 * Passing them in reverse order inverts the sign of all change values.
 *
 * ─── Dimensions compared ───────────────────────────────────────────────────
 *   Score dimensions  (0–100 scale):
 *     overall, consistency, weeklyVolume, progressiveOverload, recovery, nutrition
 *   Confidence        (scaled from [0, 1] → [0, 100] for consistency):
 *     confidence
 *
 * ─── Confidence guard ──────────────────────────────────────────────────────
 *   When either snapshot's `confidenceLevel` for a given dimension is
 *   `'insufficient'`, that dimension's `trend` is set to `InsufficientData`
 *   instead of a directional classification. This prevents misleading
 *   "improvement" signals from noise in low-data periods.
 *
 * @param current  - The newer (more recent) snapshot document.
 * @param previous - The older (baseline) snapshot document.
 * @returns A complete `SnapshotComparison`.
 */
export function compareSnapshots(
  current:  IGrowthAnalysisSnapshot,
  previous: IGrowthAnalysisSnapshot,
): SnapshotComparison {
  // ── Helper: check if a sub-document has insufficient confidence ────────────
  const subDocInsufficient = (
    a: ISnapshotScoreSubDoc,
    b: ISnapshotScoreSubDoc,
  ): boolean =>
    a.confidenceLevel === INSUFFICIENT_LEVEL ||
    b.confidenceLevel === INSUFFICIENT_LEVEL;

  // ── Score dimension comparisons ────────────────────────────────────────────
  const overall = compareMetric(
    current.overallScore.value,
    previous.overallScore.value,
    subDocInsufficient(current.overallScore, previous.overallScore),
  );

  const consistency = compareMetric(
    current.consistencyScore.value,
    previous.consistencyScore.value,
    subDocInsufficient(current.consistencyScore, previous.consistencyScore),
  );

  const weeklyVolume = compareMetric(
    current.weeklyVolumeScore.value,
    previous.weeklyVolumeScore.value,
    subDocInsufficient(current.weeklyVolumeScore, previous.weeklyVolumeScore),
  );

  const progressiveOverload = compareMetric(
    current.progressiveOverloadScore.value,
    previous.progressiveOverloadScore.value,
    subDocInsufficient(
      current.progressiveOverloadScore,
      previous.progressiveOverloadScore,
    ),
  );

  const recovery = compareMetric(
    current.recoveryScore.value,
    previous.recoveryScore.value,
    subDocInsufficient(current.recoveryScore, previous.recoveryScore),
  );

  const nutrition = compareMetric(
    current.nutritionScore.value,
    previous.nutritionScore.value,
    subDocInsufficient(current.nutritionScore, previous.nutritionScore),
  );

  // ── Confidence comparison ──────────────────────────────────────────────────
  // `overallConfidence` is a [0, 1] float at the document root.
  // Scale to [0, 100] so all MetricComparison.current/previous values share
  // the same unit and percentage-change calculations are meaningful.
  const confidence = compareMetric(
    current.overallConfidence  * 100,
    previous.overallConfidence * 100,
    current.insufficientData || previous.insufficientData,
  );

  // ── Assemble the dimensions map ────────────────────────────────────────────
  const dimensions: MetricDimensions = {
    overall,
    consistency,
    weeklyVolume,
    progressiveOverload,
    recovery,
    nutrition,
    confidence,
  };

  // ── Derive highlights and summary ──────────────────────────────────────────
  const highlights = identifyHighlights(dimensions);
  const summary    = generateSummary(dimensions);

  // ── Build meta ─────────────────────────────────────────────────────────────
  const meta: ComparisonMeta = {
    currentSnapshotId:  String(current._id),
    previousSnapshotId: String(previous._id),
    currentAnalyzedAt:  current.analyzedAt,
    previousAnalyzedAt: previous.analyzedAt,
    daysBetween: Math.round(
      (current.analyzedAt.getTime() - previous.analyzedAt.getTime()) / MS_PER_DAY,
    ),
  };

  return { ...dimensions, highlights, summary, meta };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Round to 2 decimal places (used for current / previous / change). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Round to 1 decimal place (used for percentageChange). */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Converts the `MetricDimensions` map into an ordered array of `DimensionEntry`
 * objects for iteration. Order matches the keys of `DIMENSION_LABELS`.
 */
function buildDimensionEntries(dimensions: MetricDimensions): DimensionEntry[] {
  return (Object.keys(DIMENSION_LABELS) as Array<keyof MetricDimensions>).map(
    (key) => ({
      key,
      label:      DIMENSION_LABELS[key],
      comparison: dimensions[key],
    }),
  );
}

/**
 * Maps a `DimensionEntry` to a `ComparisonHighlight` of the specified type.
 * Generates a plain-English message from the dimension label and magnitude.
 */
function toHighlight(
  entry: DimensionEntry,
  type: 'improvement' | 'regression',
): ComparisonHighlight {
  const { comparison, label } = entry;
  const absChange = Math.abs(comparison.change).toFixed(1);
  const message   =
    type === 'improvement'
      ? `${label} improved by ${absChange} points.`
      : `${label} declined by ${absChange} points.`;

  return {
    dimension:        label,
    type,
    change:           comparison.change,
    percentageChange: comparison.percentageChange,
    severity:         comparison.severity,
    message,
  };
}

/**
 * Generates a plain-English narrative summarising the overall comparison result.
 * Rule-based, deterministic — no randomness or LLM calls.
 *
 * Branch logic:
 *   InsufficientData → generic "not enough data" message
 *   Improving + Significant → "strong progress" with counts
 *   Improving + (other)    → "steady improvement"
 *   Declining + Significant → "notable setback" with action prompt
 *   Declining + (other)    → "slight dip"
 *   Stable                 → "consistent performance"
 */
function buildNarrative(
  overall:         MetricComparison,
  improvedCount:   number,
  totalDimensions: number,
): string {
  const { change, trend, severity, current } = overall;
  const absChange = Math.abs(change).toFixed(1);
  const score     = current.toFixed(0);

  if (trend === TrendDirection.InsufficientData) {
    return 'Insufficient data in one or both snapshots for a meaningful comparison.';
  }

  if (trend === TrendDirection.Improving) {
    if (severity === ChangeSeverity.Significant) {
      return (
        `Strong progress: your Growth Intelligence score climbed ${absChange} points ` +
        `to ${score}, with ${improvedCount} of ${totalDimensions} dimensions improving.`
      );
    }
    return `Steady improvement: your Growth Intelligence score rose ${absChange} points to ${score}.`;
  }

  if (trend === TrendDirection.Declining) {
    if (severity === ChangeSeverity.Significant) {
      return (
        `Notable setback: your Growth Intelligence score dropped ${absChange} points ` +
        `to ${score}. Review the highlighted dimensions for targeted improvements.`
      );
    }
    return `Slight dip: your Growth Intelligence score fell ${absChange} points to ${score}.`;
  }

  // TrendDirection.Stable
  return `Consistent performance: your Growth Intelligence score held steady at ${score}.`;
}
