import { z } from "zod";
import { TASK_TYPES, TASK_STATUSES, type TaskType, type TaskStatus } from "@/lib/db/schema";

export const taskTypeSchema = z.enum(TASK_TYPES);
export const taskStatusSchema = z.enum(TASK_STATUSES);

const optionalTrimmedString = (max: number) => z.string().trim().max(max).optional();

export const taskSchema = z.object({
  courseId: optionalTrimmedString(100),
  type: taskTypeSchema,
  title: z.string().trim().min(1, "Title is required").max(200),
  description: optionalTrimmedString(2000),
  status: taskStatusSchema.default("TODO"),
  dueDate: z.coerce.date({ error: "Enter a valid due date" }),
  estimatedHours: z.coerce.number().positive("Estimated hours must be greater than 0").optional(),
  progressPercent: z.coerce
    .number()
    .int()
    .min(0, "Progress must be between 0 and 100")
    .max(100, "Progress must be between 0 and 100")
    .default(0),
  weight: z.coerce.number().min(0, "Weight must be non-negative").default(1),
});

// Written by hand rather than z.infer — see validation/courses.ts for why.
export type TaskInput = {
  courseId?: string;
  type: TaskType;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate: Date;
  estimatedHours?: number;
  progressPercent: number;
  weight: number;
};

export const updateTaskProgressSchema = z.object({
  progressPercent: z.coerce
    .number()
    .int()
    .min(0, "Progress must be between 0 and 100")
    .max(100, "Progress must be between 0 and 100"),
});

export const taskFiltersSchema = z.object({
  status: taskStatusSchema.optional(),
  type: taskTypeSchema.optional(),
  courseId: z.string().trim().min(1).optional(),
});

export type TaskFiltersInput = {
  status?: TaskStatus;
  type?: TaskType;
  courseId?: string;
};
