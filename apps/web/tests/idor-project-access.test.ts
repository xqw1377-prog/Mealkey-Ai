/**
 * IDOR 回归：跨用户访问他人 projectId 必须 FORBIDDEN
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ownerFindUnique: vi.fn(),
  projectFindFirst: vi.fn(),
  paymentFindFirst: vi.fn(),
  planFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    owner: {
      findUnique: (...args: unknown[]) => mocks.ownerFindUnique(...args),
    },
    project: {
      findFirst: (...args: unknown[]) => mocks.projectFindFirst(...args),
    },
    paymentOrder: {
      findFirst: (...args: unknown[]) => mocks.paymentFindFirst(...args),
    },
    plan: {
      findUnique: (...args: unknown[]) => mocks.planFindUnique(...args),
    },
  },
}));

import { TRPCError } from "@trpc/server";
import { getOrderForUser } from "@/server/services/payment.service";
import {
  protectedProjectProcedure,
  router,
} from "@/server/trpc";
import { prisma } from "@/lib/prisma";

const idorRouter = router({
  peekProject: protectedProjectProcedure.query(({ ctx }) => ({
    projectId: ctx.project.id,
    ownerId: ctx.ownerId,
  })),
});

function caller(userId: string, ownerId?: string) {
  return idorRouter.createCaller({
    userId,
    ownerId,
    headers: new Headers(),
  });
}

describe("IDOR · protectedProjectProcedure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("用户 A 访问用户 B 的项目 → FORBIDDEN", async () => {
    mocks.projectFindFirst.mockResolvedValue(null);
    const api = caller("user_a", "owner_a");

    await expect(api.peekProject({ projectId: "proj_b" })).rejects.toMatchObject(
      {
        code: "FORBIDDEN",
        message: expect.stringMatching(/无权限|不存在/),
      } satisfies Partial<TRPCError>,
    );

    expect(mocks.projectFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "proj_b", ownerId: "owner_a" },
      }),
    );
  });

  it("本人项目可访问", async () => {
    mocks.projectFindFirst.mockResolvedValue({
      id: "proj_a",
      name: "我的店",
    });
    const api = caller("user_a", "owner_a");
    const result = await api.peekProject({ projectId: "proj_a" });
    expect(result.projectId).toBe("proj_a");
    expect(result.ownerId).toBe("owner_a");
  });
});

describe("IDOR · getOrderForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("不能读取他人支付订单", async () => {
    mocks.paymentFindFirst.mockResolvedValue(null);
    await expect(
      getOrderForUser(prisma, "user_a", "order_of_b"),
    ).rejects.toThrow(/不存在/);

    expect(mocks.paymentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user_a",
        }),
      }),
    );
  });

  it("本人订单可读", async () => {
    mocks.paymentFindFirst.mockResolvedValue({
      id: "po1",
      orderNo: "MK1",
      userId: "user_a",
      planId: "plan_1",
      status: "pending",
    });
    mocks.planFindUnique.mockResolvedValue({
      code: "credits",
      name: "额度包",
      metadata: "{}",
    });
    const order = await getOrderForUser(prisma, "user_a", "MK1");
    expect(order.orderNo).toBe("MK1");
  });
});
