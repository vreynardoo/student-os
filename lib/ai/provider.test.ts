import { describe, expect, it, afterEach, vi } from "vitest";
import { getAIProvider, isAIProviderConfigured } from "./provider";
import { AIProviderUnavailableError } from "./types";
import { GeminiProvider } from "./gemini-provider";

describe("AI provider factory", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports not configured when GEMINI_API_KEY is unset", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(isAIProviderConfigured()).toBe(false);
  });

  it("reports configured when GEMINI_API_KEY is set", () => {
    vi.stubEnv("GEMINI_API_KEY", "a-real-looking-key");
    expect(isAIProviderConfigured()).toBe(true);
  });

  it("throws a clearly-typed error instead of crashing when the key is missing", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(() => getAIProvider()).toThrow(AIProviderUnavailableError);
  });

  it("returns a usable GeminiProvider when the key is set", () => {
    vi.stubEnv("GEMINI_API_KEY", "a-real-looking-key");
    expect(getAIProvider()).toBeInstanceOf(GeminiProvider);
  });
});
