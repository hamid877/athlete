import { z } from "zod";

export const SPLIT_TYPES = [
  "push_pull_legs",
  "bro_split",
  "upper_lower",
  "full_body",
  "arnold",
  "custom",
] as const;

export const createProgramSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  splitType: z.enum(SPLIT_TYPES, {
    message: "Invalid split type",
  }),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
