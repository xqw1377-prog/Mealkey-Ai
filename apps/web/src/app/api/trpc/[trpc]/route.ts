import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 工具调研等长 mutation；配合服务端预算，避免平台默认过短切断 */
export const maxDuration = 120;

const handler = async (req: Request) => {
  let userId: string | undefined;
  let ownerId: string | undefined;

  try {
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
      // 请求级解析 ownerId，避免每个 protectedProcedure 再查一次
      const owner = await prisma.owner.findUnique({
        where: { userId },
        select: { id: true },
      });
      ownerId = owner?.id;
    }
  } catch {
    // Auth 未就绪
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({
      headers: req.headers,
      userId,
      ownerId,
    }),
  });
};

export { handler as GET, handler as POST };
