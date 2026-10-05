import {
  AIProviderUnavailableError,
  type AIAdvisorRequest,
  type AIAdvisorResponse,
  type AIProvider,
} from "./types";

const DEFAULT_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
];

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiPart {
  text?: string;
}

interface GeminiResponseBody {
  candidates?: {
    content?: {
      parts?: GeminiPart[];
    };
  }[];
}

// Talks to Gemini over plain fetch rather than an SDK.
// A single request/response call doesn't need an SDK and keeps
// the project lightweight. This provider is only used server-side.
export class GeminiProvider implements AIProvider {
  constructor(private readonly apiKey: string) {}

  async generateReply(
    request: AIAdvisorRequest,
  ): Promise<AIAdvisorResponse> {
    const body = {
      systemInstruction: {
        parts: [{ text: request.systemInstruction }],
      },
      contents: [
        ...request.history.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        {
          role: "user",
          parts: [{ text: request.message }],
        },
      ],
    };

    let lastError = "Unknown Gemini error";

    for (const model of DEFAULT_MODELS) {
      let response: Response;

      try {
        response = await fetch(
          `${API_BASE}/${model}:generateContent?key=${this.apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          },
        );
      } catch (error) {
        throw new AIProviderUnavailableError(
          `Could not reach Gemini: ${
            error instanceof Error
              ? error.message
              : "unknown network error"
          }`,
        );
      }

      if (response.ok) {
        const data = (await response.json()) as GeminiResponseBody;

        const reply = (data.candidates?.[0]?.content?.parts ?? [])
          .map((part) => part.text ?? "")
          .join("");

        if (!reply.trim()) {
          throw new AIProviderUnavailableError(
            `Gemini returned an empty response from ${model}.`,
          );
        }

        console.log(`[advisor] Gemini model used: ${model}`);

        return { reply };
      }

      const errorText = await response.text().catch(() => "");

      lastError = `Gemini API error (${response.status}): ${errorText.slice(
        0,
        500,
      )}`;

      // Try the next model when the current model is:
      // 404 = unavailable for this API key
      // 429 = rate limited
      // 503 = temporarily unavailable / overloaded
      if (![404, 429, 503].includes(response.status)) {
        throw new AIProviderUnavailableError(lastError);
      }

      console.warn(
        `[advisor] Gemini model ${model} unavailable (${response.status}), trying fallback...`,
      );
    }

    throw new AIProviderUnavailableError(lastError);
  }
}