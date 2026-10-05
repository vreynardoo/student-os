import { describe, expect, it, vi, beforeEach } from "vitest";
import { calculatePriority } from "@/lib/priority-engine/priority-engine";
import type { PriorityInputTask } from "@/lib/priority-engine/types";
import { AIProviderUnavailableError } from "@/lib/ai/types";

const NOW = new Date("2026-06-15T12:00:00Z");

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockBuildAcademicContext = vi.fn();
vi.mock("@/lib/services/academic-context-service", () => ({
  buildAcademicContext: mockBuildAcademicContext,
}));

const mockIsAIProviderConfigured = vi.fn();
const mockGetAIProvider = vi.fn();
vi.mock("@/lib/ai/provider", () => ({
  isAIProviderConfigured: mockIsAIProviderConfigured,
  getAIProvider: mockGetAIProvider,
}));

const { POST } = await import("./route");

function makeRankedTask(id: string, title: string, dueDate: Date, estimatedHours: number) {
  const task: PriorityInputTask = { id, title, dueDate, estimatedHours, progressPercent: 0, weight: 1, status: "TODO" };
  return { task, priority: calculatePriority(task, NOW) };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/advisor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function defaultContextResult() {
  const ranked = [makeRankedTask("task-1", "Finish problem set", new Date(NOW.getTime() + 2 * 60 * 60 * 1000), 2)];
  return {
    context: {
      generatedAt: NOW.toISOString(),
      courseNames: ["Deep Learning"],
      rankedTasks: ranked.map(({ task, priority }) => ({
        title: task.title,
        courseName: "Deep Learning",
        type: "ASSIGNMENT",
        dueDate: task.dueDate.toISOString(),
        dueInHours: priority.breakdown.dueInHours,
        isOverdue: priority.breakdown.isOverdue,
        estimatedHours: task.estimatedHours,
        progressPercent: task.progressPercent,
        priorityScore: priority.score,
        priorityLevel: priority.level,
        priorityReasons: priority.reasons,
      })),
      todaysClasses: [],
      upcomingClasses: [],
    },
    rankedTasks: ranked,
    activeTasksById: new Map([
      ["task-1", { id: "task-1", title: "Finish problem set", courseName: "Deep Learning" }],
    ]),
  };
}

describe("POST /api/advisor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an unauthenticated request", async () => {
    mockAuth.mockResolvedValue(null);
    const response = await POST(makeRequest({ message: "What should I work on first?" }));
    expect(response.status).toBe(401);
    expect(mockBuildAcademicContext).not.toHaveBeenCalled();
  });

  it("rejects an empty message", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const response = await POST(makeRequest({ message: "" }));
    expect(response.status).toBe(400);
    expect(mockBuildAcademicContext).not.toHaveBeenCalled();
  });

  it("rejects a message exceeding the maximum length", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const response = await POST(makeRequest({ message: "a".repeat(2001) }));
    expect(response.status).toBe(400);
    expect(mockBuildAcademicContext).not.toHaveBeenCalled();
  });

  it("returns a graceful 503 when the AI provider is not configured, without building context", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockIsAIProviderConfigured.mockReturnValue(false);

    const response = await POST(makeRequest({ message: "What should I work on first?" }));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/temporarily unavailable/i);
  });

  it("builds context using only the session's userId, never a client-supplied one", async () => {
    mockAuth.mockResolvedValue({ user: { id: "real-session-user" } });
    mockIsAIProviderConfigured.mockReturnValue(true);
    mockBuildAcademicContext.mockResolvedValue(defaultContextResult());
    mockGetAIProvider.mockReturnValue({ generateReply: vi.fn().mockResolvedValue({ reply: "ok" }) });

    await POST(makeRequest({ message: "hi", userId: "attacker-supplied-id" }));

    expect(mockBuildAcademicContext).toHaveBeenCalledWith("real-session-user", expect.any(Date));
  });

  it("returns the assistant reply on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockIsAIProviderConfigured.mockReturnValue(true);
    mockBuildAcademicContext.mockResolvedValue(defaultContextResult());
    const generateReply = vi.fn().mockResolvedValue({ reply: "Focus on Finish problem set first." });
    mockGetAIProvider.mockReturnValue({ generateReply });

    const response = await POST(makeRequest({ message: "What should I work on first?" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: true, reply: "Focus on Finish problem set first." });
  });

  it("includes an available-time plan in the prompt when the message mentions hours", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockIsAIProviderConfigured.mockReturnValue(true);
    mockBuildAcademicContext.mockResolvedValue(defaultContextResult());
    const generateReply = vi.fn().mockResolvedValue({ reply: "ok" });
    mockGetAIProvider.mockReturnValue({ generateReply });

    await POST(makeRequest({ message: "I have 3 hours tonight. What should I do?" }));

    const sentInstruction = generateReply.mock.calls[0][0].systemInstruction as string;
    expect(sentInstruction).toContain("AVAILABLE-TIME PLAN");
    expect(sentInstruction).toContain("\"availableHours\": 3");
  });

  it("omits the available-time plan when no hours are mentioned", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockIsAIProviderConfigured.mockReturnValue(true);
    mockBuildAcademicContext.mockResolvedValue(defaultContextResult());
    const generateReply = vi.fn().mockResolvedValue({ reply: "ok" });
    mockGetAIProvider.mockReturnValue({ generateReply });

    await POST(makeRequest({ message: "What should I work on first?" }));

    const sentInstruction = generateReply.mock.calls[0][0].systemInstruction as string;
    expect(sentInstruction).not.toContain("AVAILABLE-TIME PLAN");
  });

  it("returns a graceful error when Gemini is unavailable, without leaking internal error text", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockIsAIProviderConfigured.mockReturnValue(true);
    mockBuildAcademicContext.mockResolvedValue(defaultContextResult());
    mockGetAIProvider.mockReturnValue({
      generateReply: vi.fn().mockRejectedValue(new AIProviderUnavailableError("Gemini API error (429): quota exceeded")),
    });

    const response = await POST(makeRequest({ message: "What should I work on first?" }));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/temporarily unavailable/i);
    expect(data.error).not.toContain("quota exceeded");
  });

  it("returns a graceful 500 (not a crash) on an unexpected error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockIsAIProviderConfigured.mockReturnValue(true);
    mockBuildAcademicContext.mockRejectedValue(new Error("unexpected database hiccup"));

    const response = await POST(makeRequest({ message: "What should I work on first?" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).not.toContain("unexpected database hiccup");
  });
});
