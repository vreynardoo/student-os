import { describe, expect, it, vi, beforeEach } from "vitest";

const mockLimit = vi.fn();
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockInsert = vi.fn(() => ({ values: mockValues }));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
  },
}));

const { getUserByEmail, createUser } = await import("./user-service");

describe("getUserByEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no user matches", async () => {
    mockLimit.mockResolvedValueOnce([]);
    await expect(getUserByEmail("nobody@example.com")).resolves.toBeNull();
  });

  it("returns the user when one matches", async () => {
    const row = { id: "1", email: "ada@example.com", name: "Ada" };
    mockLimit.mockResolvedValueOnce([row]);
    await expect(getUserByEmail("ada@example.com")).resolves.toEqual(row);
  });
});

describe("createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new user when the email is not taken", async () => {
    mockLimit.mockResolvedValueOnce([]); // getUserByEmail: no existing user
    const created = { id: "1", email: "ada@example.com", name: "Ada" };
    mockReturning.mockResolvedValueOnce([created]);

    const result = await createUser({
      name: "Ada",
      email: "ada@example.com",
      password: "verysecure123",
    });

    expect(result).toEqual({ ok: true, user: created });
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it("rejects registration when the email is already taken", async () => {
    mockLimit.mockResolvedValueOnce([{ id: "1", email: "ada@example.com" }]);

    const result = await createUser({
      name: "Ada",
      email: "ada@example.com",
      password: "verysecure123",
    });

    expect(result).toEqual({ ok: false, error: "EMAIL_TAKEN" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("converts a database unique-constraint violation into EMAIL_TAKEN", async () => {
    // Simulates a race: the pre-check passed, but the DB caught a concurrent duplicate insert.
    mockLimit.mockResolvedValueOnce([]);
    mockReturning.mockRejectedValueOnce(Object.assign(new Error("duplicate key"), { code: "23505" }));

    const result = await createUser({
      name: "Ada",
      email: "ada@example.com",
      password: "verysecure123",
    });

    expect(result).toEqual({ ok: false, error: "EMAIL_TAKEN" });
  });

  it("never stores the plaintext password", async () => {
    mockLimit.mockResolvedValueOnce([]);
    mockReturning.mockResolvedValueOnce([{ id: "1", email: "ada@example.com", name: "Ada" }]);

    await createUser({ name: "Ada", email: "ada@example.com", password: "verysecure123" });

    const calls = mockValues.mock.calls as unknown as Array<
      [{ passwordHash?: string; password?: string }]
    >;
    const insertedValues = calls[0][0];
    expect(insertedValues.passwordHash).toBeDefined();
    expect(insertedValues.passwordHash).not.toBe("verysecure123");
    expect(insertedValues).not.toHaveProperty("password");
  });
});
