import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server";
import { auth } from "@/lib/auth";

const handler = async (req: Request) => {
  let userId: string | undefined;

  try {
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
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
    }),
  });
};

export { handler as GET, handler as POST };
