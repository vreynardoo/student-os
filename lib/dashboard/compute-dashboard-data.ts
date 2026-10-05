import { rankTasks } from "@/lib/priority-engine/priority-engine";
import type { PriorityInputTask, PriorityResult } from "@/lib/priority-engine/types";
import type { TaskWithCourse } from "@/lib/services/task-service";
import type { ScheduleWithCourse } from "@/lib/services/schedule-service";

export const DUE_SOON_WINDOW_DAYS = 7;
export const PRIORITY_TASK_LIMIT = 5;
export const UPCOMING_TASK_LIMIT = 5;

export interface DashboardData {
  activeTasks: TaskWithCourse[];
  overdueTasks: TaskWithCourse[];
  dueSoonTasks: TaskWithCourse[];
  overallProgress: number;
  topPriorityTasks: { task: TaskWithCourse; priority: PriorityResult }[];
  upcomingTasks: TaskWithCourse[];
  todaysSchedule: ScheduleWithCourse[];
}

// Pure aggregation over already-fetched, already-scoped data (no DB access of
// its own) — same separation-of-concerns the Priority Engine itself follows,
// which is what makes this testable without rendering anything.
export function computeDashboardData(
  tasks: TaskWithCourse[],
  schedules: ScheduleWithCourse[],
  now: Date,
): DashboardData {
  // listTasksForUser orders by dueDate ascending, so filtering below preserves
  // that order — no re-sorting needed for "upcoming" or the ranking input.
  const activeTasks = tasks.filter((task) => task.status !== "COMPLETED");

  const in7Days = new Date(now.getTime() + DUE_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const overdueTasks = activeTasks.filter((task) => task.dueDate < now);
  const dueSoonTasks = activeTasks.filter((task) => task.dueDate >= now && task.dueDate <= in7Days);

  const overallProgress = activeTasks.length
    ? Math.round(activeTasks.reduce((sum, task) => sum + task.progressPercent, 0) / activeTasks.length)
    : 0;

  const priorityInputs: PriorityInputTask[] = activeTasks.map((task) => ({
    id: task.id,
    title: task.title,
    dueDate: task.dueDate,
    estimatedHours: task.estimatedHours,
    progressPercent: task.progressPercent,
    weight: task.weight,
    status: task.status as PriorityInputTask["status"],
  }));
  const activeTaskById = new Map(activeTasks.map((task) => [task.id, task]));
  const topPriorityTasks = rankTasks(priorityInputs, now)
    .slice(0, PRIORITY_TASK_LIMIT)
    .map((ranked) => ({ task: activeTaskById.get(ranked.task.id)!, priority: ranked.priority }));

  const upcomingTasks = activeTasks.slice(0, UPCOMING_TASK_LIMIT);

  // Schema's dayOfWeek is ISO-8601 (Monday=1 ... Sunday=7); Date#getDay() is
  // 0=Sunday..6=Saturday, so Sunday needs mapping to 7.
  const todayIsoDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const todaysSchedule = schedules.filter((schedule) => schedule.dayOfWeek === todayIsoDayOfWeek);

  return { activeTasks, overdueTasks, dueSoonTasks, overallProgress, topPriorityTasks, upcomingTasks, todaysSchedule };
}
