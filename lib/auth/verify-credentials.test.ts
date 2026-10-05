import { describe, expect, it, vi, beforeEach } from "vitest";
import { hashPassword } from "./password";

const mockGetUserByEmail = vi.fn();

vi.mock("@/lib/services/user-service", () => ({
  getUserByEmail: mockGetUserByEmail,
}));

const { verifyCredentials } = await import("./verify-credentials");

describe("verifyCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the user on a valid email/password combination", async () => {
    const passwordHash = await hashPassword("correct-password");
    mockGetUserByEmail.mockResolvedValueOnce({
      id: "1",
      email: "ada@example.com",
      name: "Ada",
      passwordHash,
    });

    const result = await verifyCredentials({ email: "ada@example.com", password: "correct-password" });

    expect(result).toEqual({ id: "1", email: "ada@example.com", name: "Ada" });
  });

  it("returns null for a wrong password", async () => {
    const passwordHash = await hashPassword("correct-password");
    mockGetUserByEmail.mockResolvedValueOnce({
      id: "1",
      email: "ada@example.com",
      name: "Ada",
      passwordHash,
    });

    const result = await verifyCredentials({ email: "ada@example.com", password: "wrong-password" });

    expect(result).toBeNull();
  });

  it("returns null when the user does not exist", async () => {
    mockGetUserByEmail.mockResolvedValueOnce(null);

    const result = await verifyCredentials({ email: "nobody@example.com", password: "anything" });

    expect(result).toBeNull();
  });

  it("returns null without touching the database when input fails validation", async () => {
    const result = await verifyCredentials({ email: "not-an-email", password: "" });

    expect(result).toBeNull();
    expect(mockGetUserByEmail).not.toHaveBeenCalled();
  });

  it("never leaks the password hash in the returned user", async () => {
    const passwordHash = await hashPassword("correct-password");
    mockGetUserByEmail.mockResolvedValueOnce({
      id: "1",
      email: "ada@example.com",
      name: "Ada",
      passwordHash,
    });

    const result = await verifyCredentials({ email: "ada@example.com", password: "correct-password" });

    expect(result).not.toHaveProperty("passwordHash");
  });
});
