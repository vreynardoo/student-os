import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdvisorChat } from "./advisor-chat";

export default async function AdvisorPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Academic Advisor</h1>
        <p className="text-muted-foreground">Ask about your tasks, deadlines, and study priorities.</p>
      </div>
      <AdvisorChat />
    </div>
  );
}
