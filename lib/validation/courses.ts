import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const courseSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  code: optionalText(20),
  color: optionalText(20),
  term: optionalText(50),
});

// Written by hand rather than z.infer: zod's `.optional().transform(...)` keeps
// the object key always-present (value possibly undefined) in the inferred
// type, not genuinely optional — this is the shape callers actually want.
export type CourseInput = {
  name: string;
  code?: string;
  color?: string;
  term?: string;
};
