import { describe, expect, it, vi, afterEach } from "vitest";
import { GeminiProvider } from "./gemini-provider";
import { AIProviderUnavailableError } from "./types";

describe("GeminiProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns the reply text from a successful response", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Focus on your overdue task." }] } }] }), {
        status: 200,
      }),
    );

    const provider = new GeminiProvider("test-key");
    const result = await provider.generateReply({ systemInstruction: "sys", history: [], message: "hi" });

    expect(result.reply).toBe("Focus on your overdue task.");
  });

  it("joins multiple text parts into one reply", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Part one. " }, { text: "Part two." }] } }] }), {
        status: 200,
      }),
    );

    const provider = new GeminiProvider("test-key");
    const result = await provider.generateReply({ systemInstruction: "sys", history: [], message: "hi" });

    expect(result.reply).toBe("Part one. Part two.");
  });

  it("maps assistant history role to Gemini's 'model' role in the request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), { status: 200 }),
    );
    global.fetch = fetchMock;

    const provider = new GeminiProvider("test-key");
    await provider.generateReply({
      systemInstruction: "sys",
      history: [{ role: "assistant", content: "previous reply" }],
      message: "follow-up",
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.contents[0]).toEqual({ role: "model", parts: [{ text: "previous reply" }] });
    expect(requestBody.contents[1]).toEqual({ role: "user", parts: [{ text: "follow-up" }] });
  });

  it("throws AIProviderUnavailableError on a non-ok HTTP response", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("quota exceeded", { status: 429 }));

    const provider = new GeminiProvider("test-key");
    await expect(provider.generateReply({ systemInstruction: "sys", history: [], message: "hi" })).rejects.toBeInstanceOf(
      AIProviderUnavailableError,
    );
  });

  it("throws AIProviderUnavailableError when the network request itself fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    const provider = new GeminiProvider("test-key");
    await expect(provider.generateReply({ systemInstruction: "sys", history: [], message: "hi" })).rejects.toBeInstanceOf(
      AIProviderUnavailableError,
    );
  });

  it("throws AIProviderUnavailableError when Gemini returns no usable text", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [] }), { status: 200 }));

    const provider = new GeminiProvider("test-key");
    await expect(provider.generateReply({ systemInstruction: "sys", history: [], message: "hi" })).rejects.toBeInstanceOf(
      AIProviderUnavailableError,
    );
  });
});
