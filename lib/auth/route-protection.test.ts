import { describe, expect, it } from "vitest";
import { isProtectedPath, shouldRedirectToLogin } from "./route-protection";

describe("isProtectedPath", () => {
  it.each(["/dashboard", "/courses", "/tasks", "/schedule", "/advisor"])(
    "treats %s as protected",
    (path) => {
      expect(isProtectedPath(path)).toBe(true);
    },
  );

  it("treats nested paths under a protected prefix as protected", () => {
    expect(isProtectedPath("/tasks/123/edit")).toBe(true);
  });

  it("does not treat public paths as protected", () => {
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/register")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
  });

  it("does not false-positive on a path that merely starts with the same letters", () => {
    expect(isProtectedPath("/taskshistory")).toBe(false);
  });
});

describe("shouldRedirectToLogin", () => {
  it("redirects an unauthenticated user away from a protected path", () => {
    expect(shouldRedirectToLogin("/dashboard", false)).toBe(true);
  });

  it("does not redirect an authenticated user on a protected path", () => {
    expect(shouldRedirectToLogin("/dashboard", true)).toBe(false);
  });

  it("does not redirect on a public path regardless of auth state", () => {
    expect(shouldRedirectToLogin("/login", false)).toBe(false);
    expect(shouldRedirectToLogin("/login", true)).toBe(false);
  });
});
