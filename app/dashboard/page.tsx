import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Welcome, {session?.user?.name ?? "student"}.</h1>
      <p className="text-muted-foreground">
        This is a placeholder. Courses, tasks, and priorities land in later phases.
      </p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="outline">
          Log out
        </Button>
      </form>
    </main>
  );
}
