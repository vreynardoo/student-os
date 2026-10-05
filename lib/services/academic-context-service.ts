import { listCoursesForUser } from "@/lib/services/course-service";
import { listTasksForUser, type TaskWithCourse } from "@/lib/services/task-service";
import { listSchedulesForUser } from "@/lib/services/schedule-service";
import { rankTasks } from "@/lib/priority-engine/priority-engine";
import type { PriorityInputTask, RankedTask } from "@/lib/priority-engine/types";

export interface AdvisorTaskContext {
  title: string;
  courseName: string | null;
  type: string;
  dueDate: string;
  dueInHours: number;
  isOverdue: boolean;
  estimatedHours: number | null;
  progressPercent: number;
  priorityScore: number;
  priorityLevel: string;
  priorityReasons: string[];
}

export interface AdvisorScheduleContext {
  courseName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string | null;
}

// Exactly what the AI is allowed to see — no ids, no userId, no raw DB rows.
// Ranking order and priority numbers come straight from the real Priority
// Engine; this module never recomputes or guesses a priority itself.
export interface AcademicContext {
  generatedAt: string;
  courseNames: string[];
  rankedTasks: AdvisorTaskContext[];
  todaysClasses: AdvisorScheduleContext[];
  upcomingClasses: AdvisorScheduleContext[];
}

export interface AcademicContextResult {
  context: AcademicContext;
  // The engine's native ranked output (carries task ids) and a lookup back to
  // the full DB rows — kept server-side only, for planAvailableTime and for
  // matching a plan's task ids back to a title/course when summarizing it.
  rankedTasks: RankedTask[];
  activeTasksById: Map<string, TaskWithCourse>;
}

export async function buildAcademicContext(userId: string, now: Date = new Date()): Promise<AcademicContextResult> {
  const [tasks, schedules, courses] = await Promise.all([
    listTasksForUser(userId),
    listSchedulesForUser(userId),
    listCoursesForUser(userId),
  ]);

  const activeTasks = tasks.filter((task) => task.status !== "COMPLETED");
  const activeTasksById = new Map(activeTasks.map((task) => [task.id, task]));

  const priorityInputs: PriorityInputTask[] = activeTasks.map((task) => ({
    id: task.id,
    title: task.title,
    dueDate: task.dueDate,
    estimatedHours: task.estimatedHours,
    progressPercent: task.progressPercent,
    weight: task.weight,
    status: task.status as PriorityInputTask["status"],
  }));
  const ranked = rankTasks(priorityInputs, now);

  const rankedTaskContexts: AdvisorTaskContext[] = ranked.map(({ task: priorityTask, priority }) => {
    const task = activeTasksById.get(priorityTask.id)!;
    return {
      title: task.title,
      courseName: task.courseName,
      type: task.type,
      dueDate: task.dueDate.toISOString(),
      dueInHours: Math.round(priority.breakdown.dueInHours * 10) / 10,
      isOverdue: priority.breakdown.isOverdue,
      estimatedHours: task.estimatedHours,
      progressPercent: task.progressPercent,
      priorityScore: priority.score,
      priorityLevel: priority.level,
      priorityReasons: priority.reasons,
    };
  });

  const todayIsoDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const todaysClasses = schedules.filter((s) => s.dayOfWeek === todayIsoDayOfWeek).map(toScheduleContext);
  const upcomingClasses = schedules.filter((s) => s.dayOfWeek !== todayIsoDayOfWeek).map(toScheduleContext);

  return {
    context: {
      generatedAt: now.toISOString(),
      courseNames: courses.map((course) => course.name),
      rankedTasks: rankedTaskContexts,
      todaysClasses,
      upcomingClasses,
    },
    rankedTasks: ranked,
    activeTasksById,
  };
}

function toScheduleContext(schedule: {
  courseName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string | null;
}): AdvisorScheduleContext {
  return {
    courseName: schedule.courseName,
    dayOfWeek: schedule.dayOfWeek,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    location: schedule.location,
  };
}
