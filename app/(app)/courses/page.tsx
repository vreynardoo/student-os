import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listCoursesForUser } from "@/lib/services/course-service";
import { CoursesClient } from "./courses-client";

export default async function CoursesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const courses = await listCoursesForUser(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Courses</h1>
        <p className="text-muted-foreground">Manage the courses you&apos;re taking this term.</p>
      </div>
      <CoursesClient courses={courses} />
    </div>
  );
}
