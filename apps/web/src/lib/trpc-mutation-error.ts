import { TRPCClientError } from "@trpc/client";

/**
 * 把 tRPC / 隧道 HTML 失败收敛成可执行中文提示。
 */
export function formatTrpcMutationError(error: unknown): string {
  const message =
    error instanceof TRPCClientError
      ? error.message
      : error instanceof Error
        ? error.message
        : "操作失败";

  if (/DOCTYPE|not valid JSON|Unexpected token\s+'<'/i.test(message)) {
    return "请求被中断或返回了网页而非数据（常见于公网隧道超时）。请改用本机 http://localhost:3004 打开后重试；工具调研需较长联网时间，不适合走临时隧道。";
  }

  if (/failed to fetch|networkerror|load failed|aborted/i.test(message)) {
    return "网络中断。若正在用公网隧道，请改用本机 localhost:3004 重试。";
  }

  return message;
}
