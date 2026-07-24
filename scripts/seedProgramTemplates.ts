import "./loadEnv";
import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import Exercise from "../models/exercise.model";
import ProgramTemplate from "../models/ProgramTemplate";
import type {
  IProgramTemplate,
  IProgramTemplateDay,
  IWorkoutTemplateExercise,
} from "../models/ProgramTemplate";

// ─── Input Types (schema-aligned, no `any`) ───────────────────────────────────

type ExerciseInput = Omit<IWorkoutTemplateExercise, never>;

interface WorkoutDayInput {
  day: IProgramTemplateDay["day"];
  isRestDay: boolean;
  workout: {
    name: string;
    isRestDay: boolean;
    exercises: ExerciseInput[];
  } | null;
}

type ProgramTemplateInput = Omit<
  IProgramTemplate,
  keyof mongoose.Document | "createdAt" | "updatedAt"
> & {
  workoutDays: WorkoutDayInput[];
};

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Build an exercise entry. rest is in seconds. */
function ex(
  exerciseSlug: string,
  order: number,
  sets: number,
  repMin: number,
  repMax: number,
  rest: number
): ExerciseInput {
  return { exerciseSlug, order, sets, repRange: { min: repMin, max: repMax }, rest };
}

/** Build a rest day entry. */
function restDay(day: IProgramTemplateDay["day"]): WorkoutDayInput {
  return { day, isRestDay: true, workout: null };
}

// ─── Template Definitions ─────────────────────────────────────────────────────

const TEMPLATES: ProgramTemplateInput[] = [
  // ── 1. Push Pull Legs ───────────────────────────────────────────────────────
  {
    name: "Push Pull Legs (PPL)",
    splitType: "push_pull_legs",
    description:
      "A classic 6-day hypertrophy split targeting each muscle group twice per week. Push days hit chest, shoulders, and triceps; pull days hit back and biceps; leg days hit quads, hamstrings, and glutes.",
    difficulty: "intermediate",
    goal: "hypertrophy",
    daysPerWeek: 6,
    estimatedSessionMinutes: 70,
    tags: ["hypertrophy", "6-day", "intermediate", "push-pull-legs"],
    version: "1.0",
    workoutDays: [
      {
        day: "Monday",
        isRestDay: false,
        workout: {
          name: "Push A — Chest & Shoulders Focus",
          isRestDay: false,
          exercises: [
            ex("barbell-bench-press",         1, 4, 6, 10, 120),
            ex("incline-dumbbell-press",       2, 3, 8, 12, 90),
            ex("overhead-barbell-press",       3, 3, 8, 12, 90),
            ex("cable-lateral-raise",          4, 4, 12, 16, 60),
            ex("cable-crossover",              5, 3, 12, 15, 60),
            ex("cable-tricep-pushdown",        6, 3, 12, 15, 60),
            ex("overhead-dumbbell-tricep-extension", 7, 3, 10, 14, 60),
          ],
        },
      },
      {
        day: "Tuesday",
        isRestDay: false,
        workout: {
          name: "Pull A — Back & Biceps Focus",
          isRestDay: false,
          exercises: [
            ex("barbell-deadlift",             1, 3, 4, 6,  180),
            ex("pull-up",                      2, 3, 6, 10, 90),
            ex("barbell-row",                  3, 3, 8, 10, 90),
            ex("seated-cable-row",             4, 3, 10, 14, 75),
            ex("face-pull",                    5, 3, 15, 20, 60),
            ex("barbell-bicep-curl",           6, 3, 8, 12, 60),
            ex("hammer-curl",                  7, 3, 10, 14, 60),
          ],
        },
      },
      {
        day: "Wednesday",
        isRestDay: false,
        workout: {
          name: "Legs A — Quad & Glute Focus",
          isRestDay: false,
          exercises: [
            ex("barbell-back-squat",           1, 4, 6, 10, 150),
            ex("leg-press",                    2, 3, 10, 15, 90),
            ex("bulgarian-split-squat",        3, 3, 10, 14, 90),
            ex("leg-extension",                4, 3, 12, 16, 60),
            ex("lying-leg-curl",               5, 3, 10, 14, 60),
            ex("barbell-hip-thrust",           6, 3, 10, 14, 90),
            ex("standing-calf-raise",          7, 4, 12, 20, 60),
          ],
        },
      },
      {
        day: "Thursday",
        isRestDay: false,
        workout: {
          name: "Push B — Chest & Tricep Focus",
          isRestDay: false,
          exercises: [
            ex("incline-barbell-bench-press",  1, 4, 8, 12, 120),
            ex("dumbbell-fly",                 2, 3, 12, 15, 75),
            ex("dumbbell-shoulder-press",      3, 3, 10, 14, 90),
            ex("dumbbell-lateral-raise",       4, 4, 12, 16, 60),
            ex("pec-deck-fly",                 5, 3, 13, 16, 60),
            ex("skull-crusher",                6, 3, 10, 14, 75),
            ex("close-grip-barbell-bench-press", 7, 3, 8, 12, 75),
          ],
        },
      },
      {
        day: "Friday",
        isRestDay: false,
        workout: {
          name: "Pull B — Back Width & Bicep Focus",
          isRestDay: false,
          exercises: [
            ex("lat-pulldown",                 1, 4, 8, 12, 90),
            ex("one-arm-dumbbell-row",         2, 3, 10, 14, 75),
            ex("chest-supported-dumbbell-row", 3, 3, 10, 14, 75),
            ex("straight-arm-lat-pulldown",    4, 3, 12, 16, 60),
            ex("rear-delt-dumbbell-fly",       5, 3, 15, 20, 60),
            ex("preacher-curl",                6, 3, 10, 13, 60),
            ex("cable-bicep-curl",             7, 3, 12, 15, 60),
          ],
        },
      },
      {
        day: "Saturday",
        isRestDay: false,
        workout: {
          name: "Legs B — Hamstring & Posterior Chain Focus",
          isRestDay: false,
          exercises: [
            ex("romanian-deadlift",            1, 4, 8, 12, 120),
            ex("hack-squat",                   2, 3, 10, 14, 90),
            ex("lying-leg-curl",               3, 4, 10, 14, 75),
            ex("leg-extension",                4, 3, 14, 18, 60),
            ex("barbell-hip-thrust",           5, 3, 12, 16, 90),
            ex("seated-calf-raise",            6, 4, 15, 20, 60),
          ],
        },
      },
      restDay("Sunday"),
    ],
  },

  // ── 2. Upper Lower ──────────────────────────────────────────────────────────
  {
    name: "Upper Lower Split",
    splitType: "upper_lower",
    description:
      "A 4-day strength-focused split alternating upper and lower body sessions. Each muscle group is trained twice per week with compound-heavy programming and progressive overload emphasis.",
    difficulty: "intermediate",
    goal: "strength",
    daysPerWeek: 4,
    estimatedSessionMinutes: 65,
    tags: ["strength", "4-day", "intermediate", "upper-lower"],
    version: "1.0",
    workoutDays: [
      {
        day: "Monday",
        isRestDay: false,
        workout: {
          name: "Upper A — Horizontal Push/Pull",
          isRestDay: false,
          exercises: [
            ex("barbell-bench-press",          1, 4, 4, 6,  180),
            ex("barbell-row",                  2, 4, 4, 6,  180),
            ex("overhead-barbell-press",       3, 3, 6, 8,  120),
            ex("lat-pulldown",                 4, 3, 8, 12, 90),
            ex("incline-dumbbell-press",       5, 3, 8, 12, 90),
            ex("seated-cable-row",             6, 3, 10, 14, 75),
            ex("skull-crusher",                7, 3, 10, 14, 60),
            ex("ez-bar-bicep-curl",            8, 3, 10, 14, 60),
          ],
        },
      },
      {
        day: "Tuesday",
        isRestDay: false,
        workout: {
          name: "Lower A — Squat Focus",
          isRestDay: false,
          exercises: [
            ex("barbell-back-squat",           1, 4, 4, 6,  180),
            ex("romanian-deadlift",            2, 3, 8, 12, 120),
            ex("leg-press",                    3, 3, 10, 15, 90),
            ex("lying-leg-curl",               4, 3, 10, 14, 75),
            ex("barbell-hip-thrust",           5, 3, 10, 14, 90),
            ex("standing-calf-raise",          6, 4, 12, 20, 60),
          ],
        },
      },
      restDay("Wednesday"),
      {
        day: "Thursday",
        isRestDay: false,
        workout: {
          name: "Upper B — Vertical Push/Pull",
          isRestDay: false,
          exercises: [
            ex("overhead-barbell-press",       1, 4, 4, 6,  180),
            ex("pull-up",                      2, 4, 5, 8,  150),
            ex("incline-barbell-bench-press",  3, 3, 8, 12, 90),
            ex("one-arm-dumbbell-row",         4, 3, 10, 14, 75),
            ex("dumbbell-lateral-raise",       5, 3, 12, 16, 60),
            ex("face-pull",                    6, 3, 15, 20, 60),
            ex("cable-tricep-pushdown",        7, 3, 12, 16, 60),
            ex("hammer-curl",                  8, 3, 12, 16, 60),
          ],
        },
      },
      {
        day: "Friday",
        isRestDay: false,
        workout: {
          name: "Lower B — Deadlift Focus",
          isRestDay: false,
          exercises: [
            ex("barbell-deadlift",             1, 4, 3, 5,  210),
            ex("barbell-front-squat",          2, 3, 6, 8,  150),
            ex("seated-leg-curl",              3, 3, 10, 14, 75),
            ex("leg-extension",                4, 3, 12, 16, 60),
            ex("barbell-hip-thrust",           5, 3, 10, 14, 90),
            ex("seated-calf-raise",            6, 4, 15, 20, 60),
          ],
        },
      },
      restDay("Saturday"),
      restDay("Sunday"),
    ],
  },

  // ── 3. Full Body 3-Day ──────────────────────────────────────────────────────
  {
    name: "Full Body 3-Day",
    splitType: "full_body",
    description:
      "A beginner-friendly 3-day full-body program. Each session trains every major muscle group with one to two compound lifts, making it ideal for those new to structured resistance training.",
    difficulty: "beginner",
    goal: "general_fitness",
    daysPerWeek: 3,
    estimatedSessionMinutes: 55,
    tags: ["beginner", "3-day", "full-body", "general-fitness"],
    version: "1.0",
    workoutDays: [
      {
        day: "Monday",
        isRestDay: false,
        workout: {
          name: "Full Body A",
          isRestDay: false,
          exercises: [
            ex("barbell-back-squat",           1, 3, 8, 10, 120),
            ex("barbell-bench-press",          2, 3, 8, 10, 90),
            ex("barbell-row",                  3, 3, 8, 10, 90),
            ex("overhead-barbell-press",       4, 2, 10, 12, 75),
            ex("romanian-deadlift",            5, 3, 10, 12, 90),
            ex("plank",                        6, 3, 20, 30, 60),
          ],
        },
      },
      restDay("Tuesday"),
      {
        day: "Wednesday",
        isRestDay: false,
        workout: {
          name: "Full Body B",
          isRestDay: false,
          exercises: [
            ex("barbell-deadlift",             1, 3, 5, 6,  150),
            ex("goblet-squat",                 2, 3, 10, 14, 75),
            ex("lat-pulldown",                 3, 3, 10, 12, 75),
            ex("dumbbell-shoulder-press",      4, 3, 10, 12, 75),
            ex("dumbbell-bicep-curl",          5, 2, 12, 15, 60),
            ex("cable-tricep-pushdown",        6, 2, 12, 15, 60),
          ],
        },
      },
      restDay("Thursday"),
      {
        day: "Friday",
        isRestDay: false,
        workout: {
          name: "Full Body C",
          isRestDay: false,
          exercises: [
            ex("leg-press",                    1, 3, 10, 15, 90),
            ex("incline-dumbbell-press",       2, 3, 10, 12, 75),
            ex("seated-cable-row",             3, 3, 10, 12, 75),
            ex("dumbbell-lateral-raise",       4, 3, 12, 16, 60),
            ex("lying-leg-curl",               5, 3, 10, 14, 75),
            ex("standing-calf-raise",          6, 3, 15, 20, 60),
          ],
        },
      },
      restDay("Saturday"),
      restDay("Sunday"),
    ],
  },

  // ── 4. Arnold Split ─────────────────────────────────────────────────────────
  {
    name: "Arnold Split",
    splitType: "arnold",
    description:
      "Popularised by Arnold Schwarzenegger, this 6-day split pairs chest/back on the same day for a massive pump, then shoulders/arms the next day, followed by legs. Each pairing is trained twice per week.",
    difficulty: "advanced",
    goal: "hypertrophy",
    daysPerWeek: 6,
    estimatedSessionMinutes: 75,
    tags: ["hypertrophy", "6-day", "advanced", "arnold", "chest-back"],
    version: "1.0",
    workoutDays: [
      {
        day: "Monday",
        isRestDay: false,
        workout: {
          name: "Chest & Back A",
          isRestDay: false,
          exercises: [
            ex("barbell-bench-press",          1, 4, 6, 10, 120),
            ex("pull-up",                      2, 4, 6, 10, 120),
            ex("incline-dumbbell-press",       3, 3, 10, 14, 90),
            ex("barbell-row",                  4, 3, 8, 12, 90),
            ex("dumbbell-fly",                 5, 3, 12, 15, 60),
            ex("seated-cable-row",             6, 3, 10, 14, 75),
            ex("cable-crossover",              7, 3, 14, 18, 60),
            ex("face-pull",                    8, 3, 15, 20, 60),
          ],
        },
      },
      {
        day: "Tuesday",
        isRestDay: false,
        workout: {
          name: "Shoulders & Arms A",
          isRestDay: false,
          exercises: [
            ex("arnold-press",                 1, 4, 8, 12, 90),
            ex("barbell-bicep-curl",           2, 4, 8, 12, 75),
            ex("cable-tricep-pushdown",        3, 4, 10, 14, 75),
            ex("dumbbell-lateral-raise",       4, 3, 12, 16, 60),
            ex("hammer-curl",                  5, 3, 10, 14, 60),
            ex("skull-crusher",                6, 3, 10, 14, 75),
            ex("rear-delt-dumbbell-fly",       7, 3, 15, 20, 60),
            ex("concentration-curl",           8, 2, 12, 15, 60),
          ],
        },
      },
      {
        day: "Wednesday",
        isRestDay: false,
        workout: {
          name: "Legs A",
          isRestDay: false,
          exercises: [
            ex("barbell-back-squat",           1, 4, 8, 12, 150),
            ex("romanian-deadlift",            2, 4, 8, 12, 120),
            ex("leg-press",                    3, 3, 12, 16, 90),
            ex("lying-leg-curl",               4, 3, 10, 14, 75),
            ex("leg-extension",                5, 3, 12, 16, 60),
            ex("barbell-hip-thrust",           6, 3, 10, 14, 90),
            ex("standing-calf-raise",          7, 4, 15, 20, 60),
          ],
        },
      },
      {
        day: "Thursday",
        isRestDay: false,
        workout: {
          name: "Chest & Back B",
          isRestDay: false,
          exercises: [
            ex("incline-barbell-bench-press",  1, 4, 8, 12, 120),
            ex("lat-pulldown",                 2, 4, 8, 12, 90),
            ex("pec-deck-fly",                 3, 3, 12, 16, 60),
            ex("one-arm-dumbbell-row",         4, 3, 10, 14, 75),
            ex("chest-dip",                    5, 3, 10, 14, 90),
            ex("straight-arm-lat-pulldown",    6, 3, 12, 16, 60),
            ex("incline-dumbbell-fly",         7, 3, 12, 16, 60),
          ],
        },
      },
      {
        day: "Friday",
        isRestDay: false,
        workout: {
          name: "Shoulders & Arms B",
          isRestDay: false,
          exercises: [
            ex("dumbbell-shoulder-press",      1, 4, 8, 12, 90),
            ex("ez-bar-bicep-curl",            2, 4, 8, 12, 75),
            ex("overhead-dumbbell-tricep-extension", 3, 4, 10, 14, 75),
            ex("cable-lateral-raise",          4, 3, 13, 17, 60),
            ex("preacher-curl",                5, 3, 10, 13, 60),
            ex("close-grip-barbell-bench-press", 6, 3, 8, 12, 75),
            ex("dumbbell-front-raise",         7, 3, 12, 16, 60),
          ],
        },
      },
      {
        day: "Saturday",
        isRestDay: false,
        workout: {
          name: "Legs B",
          isRestDay: false,
          exercises: [
            ex("barbell-deadlift",             1, 3, 4, 6,  180),
            ex("hack-squat",                   2, 3, 10, 14, 90),
            ex("bulgarian-split-squat",        3, 3, 10, 14, 90),
            ex("seated-leg-curl",              4, 3, 10, 14, 75),
            ex("glute-ham-raise",              5, 3, 8, 12, 90),
            ex("seated-calf-raise",            6, 4, 15, 20, 60),
          ],
        },
      },
      restDay("Sunday"),
    ],
  },

  // ── 5. Bro Split ────────────────────────────────────────────────────────────
  {
    name: "Bro Split (5-Day)",
    splitType: "bro_split",
    description:
      "The classic bodybuilder bro split: one muscle group per day, five days per week. High volume per muscle group with a strong hypertrophy focus. A tried-and-true approach for intermediate lifters.",
    difficulty: "intermediate",
    goal: "hypertrophy",
    daysPerWeek: 5,
    estimatedSessionMinutes: 60,
    tags: ["hypertrophy", "5-day", "intermediate", "bro-split", "bodybuilding"],
    version: "1.0",
    workoutDays: [
      {
        day: "Monday",
        isRestDay: false,
        workout: {
          name: "Chest Day",
          isRestDay: false,
          exercises: [
            ex("barbell-bench-press",          1, 4, 6, 10, 120),
            ex("incline-dumbbell-press",       2, 4, 8, 12, 90),
            ex("decline-barbell-bench-press",  3, 3, 8, 12, 90),
            ex("cable-crossover",              4, 3, 12, 16, 60),
            ex("pec-deck-fly",                 5, 3, 14, 18, 60),
            ex("chest-dip",                    6, 3, 10, 14, 75),
          ],
        },
      },
      {
        day: "Tuesday",
        isRestDay: false,
        workout: {
          name: "Back Day",
          isRestDay: false,
          exercises: [
            ex("barbell-deadlift",             1, 3, 4, 6,  180),
            ex("pull-up",                      2, 4, 6, 10, 120),
            ex("barbell-row",                  3, 4, 8, 12, 90),
            ex("lat-pulldown",                 4, 3, 10, 14, 75),
            ex("seated-cable-row",             5, 3, 10, 14, 75),
            ex("one-arm-dumbbell-row",         6, 3, 10, 14, 75),
            ex("dumbbell-shrug",               7, 4, 15, 20, 60),
          ],
        },
      },
      {
        day: "Wednesday",
        isRestDay: false,
        workout: {
          name: "Shoulders Day",
          isRestDay: false,
          exercises: [
            ex("overhead-barbell-press",       1, 4, 6, 10, 120),
            ex("dumbbell-shoulder-press",      2, 3, 10, 14, 90),
            ex("dumbbell-lateral-raise",       3, 4, 12, 16, 60),
            ex("cable-lateral-raise",          4, 3, 14, 18, 60),
            ex("rear-delt-dumbbell-fly",       5, 4, 15, 20, 60),
            ex("face-pull",                    6, 3, 15, 20, 60),
            ex("dumbbell-front-raise",         7, 3, 12, 16, 60),
          ],
        },
      },
      {
        day: "Thursday",
        isRestDay: false,
        workout: {
          name: "Arms Day",
          isRestDay: false,
          exercises: [
            ex("barbell-bicep-curl",           1, 4, 8, 12, 75),
            ex("cable-tricep-pushdown",        2, 4, 10, 14, 75),
            ex("incline-dumbbell-bicep-curl",  3, 3, 10, 14, 60),
            ex("skull-crusher",                4, 3, 10, 14, 75),
            ex("hammer-curl",                  5, 3, 10, 14, 60),
            ex("overhead-dumbbell-tricep-extension", 6, 3, 12, 16, 60),
            ex("preacher-curl",                7, 3, 10, 13, 60),
            ex("tricep-dip",                   8, 3, 10, 14, 60),
          ],
        },
      },
      {
        day: "Friday",
        isRestDay: false,
        workout: {
          name: "Legs Day",
          isRestDay: false,
          exercises: [
            ex("barbell-back-squat",           1, 4, 8, 12, 150),
            ex("romanian-deadlift",            2, 3, 10, 14, 120),
            ex("leg-press",                    3, 3, 12, 16, 90),
            ex("lying-leg-curl",               4, 3, 10, 14, 75),
            ex("leg-extension",                5, 3, 14, 18, 60),
            ex("barbell-hip-thrust",           6, 3, 10, 14, 90),
            ex("standing-calf-raise",          7, 4, 15, 20, 60),
            ex("seated-calf-raise",            8, 3, 20, 25, 60),
          ],
        },
      },
      restDay("Saturday"),
      restDay("Sunday"),
    ],
  },
];

// ─── Slug Validation ──────────────────────────────────────────────────────────

/** Returns the set of all exercise slugs referenced across all templates. */
function collectAllSlugs(templates: ProgramTemplateInput[]): Set<string> {
  const slugs = new Set<string>();
  for (const t of templates) {
    for (const day of t.workoutDays) {
      if (!day.isRestDay && day.workout) {
        for (const e of day.workout.exercises) {
          slugs.add(e.exerciseSlug);
        }
      }
    }
  }
  return slugs;
}

/**
 * Queries the DB for the given slugs and returns a Set of slugs that exist.
 * Logs a warning for each slug that is missing from the Exercise collection.
 */
async function buildValidSlugSet(slugs: Set<string>): Promise<Set<string>> {
  const slugArray = [...slugs];
  const found = await Exercise.find(
    { slug: { $in: slugArray } },
    { slug: 1, _id: 0 }
  ).lean();

  const validSlugs = new Set(found.map((e) => e.slug));

  for (const slug of slugArray) {
    if (!validSlugs.has(slug)) {
      console.warn(`  ⚠️  Exercise not found in DB, will be skipped: "${slug}"`);
    }
  }

  return validSlugs;
}

/**
 * Filters out any exercises whose slug is not in the valid set.
 * Logs which entries are dropped per day.
 */
function filterTemplate(
  template: ProgramTemplateInput,
  validSlugs: Set<string>
): ProgramTemplateInput {
  return {
    ...template,
    workoutDays: template.workoutDays.map((day) => {
      if (day.isRestDay || !day.workout) return day;

      const filteredExercises = day.workout.exercises.filter((e) => {
        if (!validSlugs.has(e.exerciseSlug)) {
          console.warn(
            `    Dropping missing exercise "${e.exerciseSlug}" from "${day.workout!.name}"`
          );
          return false;
        }
        return true;
      });

      return {
        ...day,
        workout: {
          ...day.workout,
          exercises: filteredExercises,
        },
      };
    }),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  const useForce = process.argv.includes("--force");

  try {
    console.log("🔌 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ Connected.\n");

    // Validate slugs against the live Exercise collection
    console.log("🔍 Validating exercise slugs against DB...");
    const allSlugs = collectAllSlugs(TEMPLATES);
    console.log(`   Found ${allSlugs.size} unique slugs across all templates.`);
    const validSlugs = await buildValidSlugSet(allSlugs);
    console.log(`   ${validSlugs.size}/${allSlugs.size} slugs confirmed in DB.\n`);

    // Optionally clear existing documents
    if (useForce) {
      const deleted = await ProgramTemplate.deleteMany({});
      console.log(`🗑️  Cleared ${deleted.deletedCount} existing template(s).\n`);
    } else {
      const existing = await ProgramTemplate.countDocuments();
      if (existing > 0) {
        console.log(
          `ℹ️  Found ${existing} existing template(s). ` +
          `Re-run with --force to clear them first.\n`
        );
      }
    }

    // Insert templates
    let insertedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const rawTemplate of TEMPLATES) {
      // Skip if a template with this name already exists (idempotent)
      const exists = await ProgramTemplate.findOne({ name: rawTemplate.name });
      if (exists) {
        console.log(`  ⏭️  Skipping (already exists): "${rawTemplate.name}"`);
        skippedCount++;
        continue;
      }

      const filtered = filterTemplate(rawTemplate, validSlugs);

      try {
        await ProgramTemplate.create(filtered);
        console.log(`  ✅ Inserted: "${filtered.name}"`);
        insertedCount++;
      } catch (err) {
        console.error(`  ❌ Failed to insert "${rawTemplate.name}":`, err);
        failedCount++;
      }
    }

    console.log("\n─────────────────────────────────────────");
    console.log(`📊 Seed complete.`);
    console.log(`   Inserted : ${insertedCount}`);
    console.log(`   Skipped  : ${skippedCount}`);
    console.log(`   Failed   : ${failedCount}`);
    console.log("─────────────────────────────────────────\n");

    await mongoose.connection.close();
    console.log("🔌 Connection closed.");
    process.exit(failedCount > 0 ? 1 : 0);
  } catch (error) {
    console.error("Fatal error during seeding:", error);
    process.exit(1);
  }
}

seed();
