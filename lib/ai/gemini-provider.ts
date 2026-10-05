import { AIProviderUnavailableError, type AIAdvisorRequest, type AIAdvisorResponse, type AIProvider } from "./types";

const DEFAULT_MODEL = "gemini-2.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiPart {
  text?: string;
}

interface GeminiResponseBody {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
}

// Talks to Gemini over plain fetch rather than an SDK — a single
// request/response call doesn't need one, and it keeps this at zero added
// dependencies. Never called from anywhere but the server (route handler).
export class GeminiProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_MODEL,
  ) {}

  async generateReply(request: AIAdvisorRequest): Promise<AIAdvisorResponse> {
    const body = {
      systemInstruction: { parts: [{ text: request.systemInstruction }] },
      contents: [
        ...request.history.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        { role: "user", parts: [{ text: request.message }] },
      ],
    };

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/${this.model}:generateContent?key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new AIProviderUnavailableError(
        `Could not reach Gemini: ${error instanceof Error ? error.message : "unknown network error"}`,
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new AIProviderUnavailableError(`Gemini API error (${response.status}): ${errorText.slice(0, 500)}`);
    }

    const data = (await response.json()) as GeminiResponseBody;
    const reply = (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");

    if (!reply.trim()) {
      throw new AIProviderUnavailableError("Gemini returned an empty response.");
    }

    return { reply };
  }
}
