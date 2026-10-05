import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { advisorRequestSchema } from "@/lib/validation/advisor";
import { buildAcademicContext } from "@/lib/services/academic-context-service";
import { planAvailableTime } from "@/lib/priority-engine/plan-available-time";
import { extractAvailableHours } from "@/lib/ai/extract-available-hours";
import { buildSystemInstruction, type AdvisorPlanSummary } from "@/lib/ai/system-prompt";
import { getAIProvider, isAIProviderConfigured } from "@/lib/ai/provider";
import { AIProviderUnavailableError } from "@/lib/ai/types";

const MAX_HISTORY_MESSAGES = 10;
const AI_UNAVAILABLE_MESSAGE =
  "Sorry, the AI advisor is temporarily unavailable. You can still use your dashboard and priority list.";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "You must be logged in." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = advisorRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid message.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    if (!isAIProviderConfigured()) {
      return NextResponse.json({ ok: false, error: AI_UNAVAILABLE_MESSAGE }, { status: 503 });
    }

    const now = new Date();
    // Context is built from the authenticated session's userId only — never
    // from anything in the request body.
    const { context, rankedTasks, activeTasksById } = await buildAcademicContext(userId, now);

    const availableHours = extractAvailableHours(parsed.data.message);
    let planSummary: AdvisorPlanSummary | undefined;
    if (availableHours != null) {
      const plan = planAvailableTime(rankedTasks, availableHours);
      planSummary = {
        availableHours,
        usedHours: plan.usedHours,
        unusedHours: plan.unusedHours,
        insufficientTime: plan.insufficientTime,
        items: plan.items.map((item) => {
          const task = activeTasksById.get(item.task.id);
          return {
            title: task?.title ?? item.task.title,
            courseName: task?.courseName ?? null,
            allocatedHours: item.allocatedHours,
            isPartial: item.isPartial,
          };
        }),
      };
    }

    const systemInstruction = buildSystemInstruction(context, planSummary);
    const history = (parsed.data.history ?? []).slice(-MAX_HISTORY_MESSAGES);

    const provider = getAIProvider();
    const { reply } = await provider.generateReply({
      systemInstruction,
      history,
      message: parsed.data.message,
    });

    return NextResponse.json({ ok: true, reply });
  } catch (error) {
    if (error instanceof AIProviderUnavailableError) {
      console.error("[advisor] AI provider unavailable:", error.message);
      return NextResponse.json({ ok: false, error: AI_UNAVAILABLE_MESSAGE }, { status: 503 });
    }

    console.error("[advisor] unexpected error:", error);
    return NextResponse.json({ ok: false, error: AI_UNAVAILABLE_MESSAGE }, { status: 500 });
  }
}
