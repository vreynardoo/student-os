import { describe, expect, it } from "vitest";
import { courseSchema } from "./courses";

describe("courseSchema", () => {
  it("accepts a name-only course", () => {
    const result = courseSchema.safeParse({ name: "Deep Learning" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Deep Learning", code: undefined, color: undefined, term: undefined });
    }
  });

  it("accepts all optional fields filled in", () => {
    const result = courseSchema.safeParse({
      name: "Deep Learning",
      code: "CS501",
      color: "#2563eb",
      term: "Fall 2026",
    });
    expect(result.success).toBe(true);
  });

  it("treats empty-string optional fields as undefined", () => {
    const result = courseSchema.safeParse({ name: "Deep Learning", code: "", color: "", term: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBeUndefined();
      expect(result.data.color).toBeUndefined();
      expect(result.data.term).toBeUndefined();
    }
  });

  it("rejects an empty name", () => {
    const result = courseSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a name that is only whitespace", () => {
    const result = courseSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("trims the name", () => {
    const result = courseSchema.safeParse({ name: "  Deep Learning  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Deep Learning");
    }
  });
});
