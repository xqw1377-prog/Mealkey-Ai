import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const updateMany = vi.fn();
const findUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      updateMany: (...args: unknown[]) => updateMany(...args),
      findUnique: (...args: unknown[]) => findUnique(...args),
    },
  },
  stringifyJsonField: (value: unknown) => JSON.stringify(value),
}));

vi.mock("@/lib/profile-schema", () => ({
  validateProfile: (raw: string | null | undefined) => {
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, unknown>;
  },
}));

describe("updateProjectProfile CAS", () => {
  beforeEach(() => {
    findFirst.mockReset();
    updateMany.mockReset();
    findUnique.mockReset();
  });

  it("retries when updatedAt conflicts then succeeds", async () => {
    const { updateProjectProfile } =
      await import("@/server/services/project-profile");

    const t1 = new Date("2026-01-01T00:00:00.000Z");
    const t2 = new Date("2026-01-01T00:00:01.000Z");
    const t3 = new Date("2026-01-01T00:00:02.000Z");

    findFirst
      .mockResolvedValueOnce({
        id: "p1",
        profile: JSON.stringify({ a: 1 }),
        updatedAt: t1,
      })
      .mockResolvedValueOnce({
        id: "p1",
        profile: JSON.stringify({ a: 2 }),
        updatedAt: t2,
      });

    updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    findUnique.mockResolvedValue({ updatedAt: t3 });

    const result = await updateProjectProfile("p1", (current) => ({
      ...current,
      touched: true,
    }));

    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(result?.profile).toMatchObject({ a: 2, touched: true });
    expect(result?.updatedAt).toEqual(t3);
  });

  it("skips write when mutator returns null", async () => {
    const { updateProjectProfile } =
      await import("@/server/services/project-profile");

    findFirst.mockResolvedValue({
      id: "p1",
      profile: JSON.stringify({ keep: true }),
      updatedAt: new Date(),
    });

    const result = await updateProjectProfile("p1", () => null);
    expect(result).toBeNull();
    expect(updateMany).not.toHaveBeenCalled();
  });
});
