import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Welcome, {session?.user?.name ?? "student"}.</h1>
      <p className="text-muted-foreground">
        This is a placeholder. Tasks and priorities land in later phases.
      </p>
    </div>
  );
}
