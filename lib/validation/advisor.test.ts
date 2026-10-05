import { describe, expect, it } from "vitest";
import { advisorRequestSchema, MAX_MESSAGE_LENGTH } from "./advisor";

describe("advisorRequestSchema", () => {
  it("accepts a valid message with no history", () => {
    expect(advisorRequestSchema.safeParse({ message: "What should I work on first?" }).success).toBe(true);
  });

  it("accepts a valid message with history", () => {
    const result = advisorRequestSchema.safeParse({
      message: "And why?",
      history: [
        { role: "user", content: "What should I work on first?" },
        { role: "assistant", content: "Your Deep Learning assignment is due soon." },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty message", () => {
    expect(advisorRequestSchema.safeParse({ message: "" }).success).toBe(false);
  });

  it("rejects a message that is only whitespace", () => {
    expect(advisorRequestSchema.safeParse({ message: "   " }).success).toBe(false);
  });

  it("rejects a message longer than the maximum length", () => {
    const tooLong = "a".repeat(MAX_MESSAGE_LENGTH + 1);
    expect(advisorRequestSchema.safeParse({ message: tooLong }).success).toBe(false);
  });

  it("accepts a message at exactly the maximum length", () => {
    const exact = "a".repeat(MAX_MESSAGE_LENGTH);
    expect(advisorRequestSchema.safeParse({ message: exact }).success).toBe(true);
  });

  it("rejects a missing message field", () => {
    expect(advisorRequestSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an invalid history role", () => {
    const result = advisorRequestSchema.safeParse({
      message: "hi",
      history: [{ role: "system", content: "x" }],
    });
    expect(result.success).toBe(false);
  });
});
