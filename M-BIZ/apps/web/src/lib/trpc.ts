import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server";

/**
 * tRPC React Client
 * 使用类型注解避免引用传递问题
 */
export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> =
  createTRPCReact<AppRouter>();
