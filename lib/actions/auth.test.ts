import { describe, expect, it, vi, beforeEach } from "vitest";

const mockCreateUser = vi.fn();

vi.mock("@/lib/services/user-service", () => ({
  createUser: mockCreateUser,
}));

const { registerUser } = await import("./auth");

describe("registerUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok without calling the database when input is invalid", async () => {
    const result = await registerUser({ name: "", email: "not-an-email", password: "short" });

    expect(result.ok).toBe(false);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("surfaces a duplicate-email error from the service layer", async () => {
    mockCreateUser.mockResolvedValueOnce({ ok: false, error: "EMAIL_TAKEN" });

    const result = await registerUser({
      name: "Ada",
      email: "ada@example.com",
      password: "verysecure123",
    });

    expect(result).toEqual({ ok: false, error: "An account with this email already exists." });
  });

  it("succeeds for valid, unique input", async () => {
    mockCreateUser.mockResolvedValueOnce({
      ok: true,
      user: { id: "1", email: "ada@example.com", name: "Ada" },
    });

    const result = await registerUser({
      name: "Ada",
      email: "ada@example.com",
      password: "verysecure123",
    });

    expect(result).toEqual({ ok: true });
  });
});
