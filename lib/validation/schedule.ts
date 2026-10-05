import { z } from "zod";

// HH:mm, 24-hour, zero-padded — comparable with plain string `>` for ordering.
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm format, e.g. 09:00");

const optionalLocation = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => (value ? value : undefined));

export const createScheduleSchema = z
  .object({
    courseId: z.string().trim().min(1, "Course is required"),
    dayOfWeek: z.coerce.number().int().min(1, "Pick a day of the week").max(7, "Pick a day of the week"),
    startTime: timeSchema,
    endTime: timeSchema,
    location: optionalLocation,
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

// Written by hand rather than z.infer — see courses.ts for why.
export type CreateScheduleInput = {
  courseId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
};

export const updateScheduleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(1, "Pick a day of the week").max(7, "Pick a day of the week"),
    startTime: timeSchema,
    endTime: timeSchema,
    location: optionalLocation,
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export type UpdateScheduleInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
};

// ISO-8601: Monday = 1 ... Sunday = 7.
export const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
] as const;
