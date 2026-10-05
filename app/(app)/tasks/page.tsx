import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listCoursesForUser } from "@/lib/services/course-service";
import { listTasksForUser } from "@/lib/services/task-service";
import { rankTasks } from "@/lib/priority-engine/priority-engine";
import type { PriorityInputTask } from "@/lib/priority-engine/types";
import { TasksClient } from "./tasks-client";
import type { RankedTaskWithCourse } from "./task-row";

export default async function TasksPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const [tasks, courses] = await Promise.all([listTasksForUser(userId), listCoursesForUser(userId)]);

  const priorityInputs: PriorityInputTask[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    dueDate: task.dueDate,
    estimatedHours: task.estimatedHours,
    progressPercent: task.progressPercent,
    weight: task.weight,
    status: task.status as PriorityInputTask["status"],
  }));

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const rankedTasks: RankedTaskWithCourse[] = rankTasks(priorityInputs).map((ranked) => ({
    priority: ranked.priority,
    task: taskById.get(ranked.task.id)!,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="text-muted-foreground">Ranked by what needs your attention first.</p>
      </div>
      <TasksClient rankedTasks={rankedTasks} courses={courses} />
    </div>
  );
}
