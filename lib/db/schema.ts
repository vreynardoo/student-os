import { check, index, integer, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const courses = pgTable(
  "courses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code"),
    color: text("color"),
    term: text("term"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("courses_user_id_idx").on(table.userId)],
);

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;

// dayOfWeek follows ISO-8601: 1 = Monday ... 7 = Sunday.
export const classSchedules = pgTable(
  "class_schedules",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    location: text("location"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("class_schedules_course_id_idx").on(table.courseId),
    check("class_schedules_day_of_week_check", sql`${table.dayOfWeek} between 1 and 7`),
    check("class_schedules_end_after_start_check", sql`${table.endTime} > ${table.startTime}`),
  ],
);

export type ClassSchedule = typeof classSchedules.$inferSelect;
export type NewClassSchedule = typeof classSchedules.$inferInsert;

export const TASK_TYPES = ["ASSIGNMENT", "EXAM", "PROJECT", "PERSONAL"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// courseId is nullable (PERSONAL tasks need no course) and ON DELETE SET NULL,
// not CASCADE: deleting a course shouldn't destroy a task's progress history —
// it just detaches the task, same as an uncategorized PERSONAL task.
export const tasks = pgTable(
  "tasks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("TODO"),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    estimatedHours: real("estimated_hours"),
    progressPercent: integer("progress_percent").notNull().default(0),
    weight: real("weight").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tasks_user_id_due_date_idx").on(table.userId, table.dueDate),
    index("tasks_user_id_status_idx").on(table.userId, table.status),
    index("tasks_course_id_idx").on(table.courseId),
    check("tasks_type_check", sql`${table.type} in ('ASSIGNMENT','EXAM','PROJECT','PERSONAL')`),
    check("tasks_status_check", sql`${table.status} in ('TODO','IN_PROGRESS','COMPLETED')`),
    check("tasks_progress_percent_check", sql`${table.progressPercent} between 0 and 100`),
    check("tasks_estimated_hours_check", sql`${table.estimatedHours} is null or ${table.estimatedHours} > 0`),
    check("tasks_weight_check", sql`${table.weight} >= 0`),
    // Defense-in-depth: the service layer always normalizes these together, but
    // this guarantees the invariant even against a future direct DB write.
    check(
      "tasks_completed_progress_check",
      sql`(${table.status} <> 'COMPLETED' or ${table.progressPercent} = 100) and (${table.progressPercent} <> 100 or ${table.status} = 'COMPLETED')`,
    ),
  ],
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
