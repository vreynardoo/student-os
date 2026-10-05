// Small provider abstraction so Gemini calls are never scattered through the
// UI or route handlers directly — everything goes through this interface.

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIAdvisorRequest {
  systemInstruction: string;
  history: AIMessage[];
  message: string;
}

export interface AIAdvisorResponse {
  reply: string;
}

export interface AIProvider {
  generateReply(request: AIAdvisorRequest): Promise<AIAdvisorResponse>;
}

// Thrown when the provider can't be used at all (no API key configured) or
// when the underlying API call fails — callers catch this and degrade
// gracefully instead of letting it become an unhandled 500.
export class AIProviderUnavailableError extends Error {}
