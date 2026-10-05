import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listTasksForUser, type TaskWithCourse } from "@/lib/services/task-service";
import { listSchedulesForUser, type ScheduleWithCourse } from "@/lib/services/schedule-service";
import { computeDashboardData } from "@/lib/dashboard/compute-dashboard-data";
import { formatDueDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVEL_BADGE_VARIANT } from "@/app/(app)/tasks/task-row";

function getGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const now = new Date();
  const [tasks, schedules] = await Promise.all([listTasksForUser(userId), listSchedulesForUser(userId)]);

  const { activeTasks, overdueTasks, dueSoonTasks, overallProgress, topPriorityTasks, upcomingTasks, todaysSchedule } =
    computeDashboardData(tasks, schedules, now);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {getGreeting(now)}, {session?.user?.name ?? "student"}.
        </h1>
        <p className="text-muted-foreground">Here&apos;s your academic overview.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Active Tasks" value={activeTasks.length} />
        <SummaryCard label="Overdue" value={overdueTasks.length} />
        <SummaryCard label="Due Soon" value={dueSoonTasks.length} />
        <SummaryCard label="Overall Progress" value={`${overallProgress}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Priority Tasks</h2>
            {topPriorityTasks.length === 0 ? (
              <EmptyState message="No active tasks — you're all caught up." />
            ) : (
              <div className="space-y-2">
                {topPriorityTasks.map(({ task, priority }) => (
                  <PriorityTaskItem key={task.id} task={task} score={priority.score} level={priority.level} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Upcoming Tasks</h2>
            {upcomingTasks.length === 0 ? (
              <EmptyState message="No upcoming tasks." />
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <UpcomingTaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Today&apos;s Schedule</h2>
            {todaysSchedule.length === 0 ? (
              <EmptyState message="No classes scheduled today." />
            ) : (
              <div className="space-y-2">
                {todaysSchedule.map((item) => (
                  <ScheduleItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              <Button render={<Link href="/tasks" />}>Add Task</Button>
              <Button variant="outline" render={<Link href="/courses" />}>
                Add Course
              </Button>
              <Button variant="outline" render={<Link href="/schedule" />}>
                View Schedule
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground">{message}</p>;
}

function PriorityTaskItem({
  task,
  score,
  level,
}: {
  task: TaskWithCourse;
  score: number;
  level: keyof typeof LEVEL_BADGE_VARIANT;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{task.title}</p>
          <p className="text-sm text-muted-foreground">
            {task.courseName ? `${task.courseName} · ` : ""}
            Due {formatDueDate(task.dueDate)} · {task.progressPercent}% done
          </p>
        </div>
        <Badge variant={LEVEL_BADGE_VARIANT[level]}>
          {level} ({score})
        </Badge>
      </CardContent>
    </Card>
  );
}

function UpcomingTaskItem({ task }: { task: TaskWithCourse }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{task.title}</p>
          <p className="text-sm text-muted-foreground">
            {task.courseName ? `${task.courseName} · ` : ""}
            Due {formatDueDate(task.dueDate)} · {task.progressPercent}% done
          </p>
        </div>
        <Badge variant="outline">{task.type}</Badge>
      </CardContent>
    </Card>
  );
}

function ScheduleItem({ item }: { item: ScheduleWithCourse }) {
  return (
    <Card>
      <CardContent>
        <p className="font-medium">{item.courseName}</p>
        <p className="text-sm text-muted-foreground">
          {item.startTime}–{item.endTime}
          {item.location ? ` · ${item.location}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}
