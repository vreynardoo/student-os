import { GeminiProvider } from "./gemini-provider";
import { AIProviderUnavailableError, type AIProvider } from "./types";

export function isAIProviderConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// Throws AIProviderUnavailableError rather than returning null so every
// caller is forced to handle the "not configured" case explicitly (callers
// should check isAIProviderConfigured() first to avoid the throw in the
// common case, but this is the safety net either way).
export function getAIProvider(): AIProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AIProviderUnavailableError("GEMINI_API_KEY is not set.");
  }
  return new GeminiProvider(apiKey);
}
