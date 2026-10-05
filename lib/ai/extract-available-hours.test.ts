import { describe, expect, it } from "vitest";
import { extractAvailableHours } from "./extract-available-hours";

describe("extractAvailableHours", () => {
  it("extracts a whole number of hours", () => {
    expect(extractAvailableHours("I have 3 hours tonight. What should I do?")).toBe(3);
  });

  it("extracts a fractional number of hours", () => {
    expect(extractAvailableHours("I only have 2.5 hrs free")).toBe(2.5);
  });

  it("recognizes a shorthand 'h' unit", () => {
    expect(extractAvailableHours("got 4h before dinner")).toBe(4);
  });

  it("recognizes singular 'hour'", () => {
    expect(extractAvailableHours("I have 1 hour")).toBe(1);
  });

  it("returns null when no time is mentioned", () => {
    expect(extractAvailableHours("What should I work on first?")).toBeNull();
  });

  it("returns null for zero hours", () => {
    expect(extractAvailableHours("I have 0 hours")).toBeNull();
  });
});
