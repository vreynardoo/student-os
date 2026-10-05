import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listCoursesForUser } from "@/lib/services/course-service";
import { listSchedulesForUser } from "@/lib/services/schedule-service";
import { ScheduleClient } from "./schedule-client";

export default async function SchedulePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const [schedules, courses] = await Promise.all([listSchedulesForUser(userId), listCoursesForUser(userId)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-muted-foreground">Your weekly class schedule.</p>
      </div>
      <ScheduleClient schedules={schedules} courses={courses} />
    </div>
  );
}
