/**
 * MealKey 前端 API 调用示例
 * 
 * 这个文件展示如何在 React 组件中调用后端 tRPC API
 * 前端开发者可以直接复制这些模式使用
 */

// ============================================================
// 1. tRPC Hooks 用法（推荐方式）
// ============================================================

// import { trpc } from "@/lib/trpc";
//
// // 查询项目列表
// const { data: projects } = trpc.project.list.useQuery();
//
// // 创建项目
// const createProject = trpc.project.create.useMutation();
// createProject.mutate({ name: "杭州湘味首店", city: "杭州", category: "湘味小馆" });
//
// // 发送消息给 AI
// const sendMessage = trpc.agent.sendMessage.useMutation();
// sendMessage.mutate({ projectId: "xxx", message: "我正在判断首店是否具备复制条件" });
//
// // 获取项目记忆
// const { data: memories } = trpc.memory.listByProject.useQuery({ projectId: "xxx" });
//
// // 搜索知识库
// const { data: results } = trpc.knowledge.search.useQuery({ query: "选址" });
//
// // 获取 Today 首页聚合数据
// const { data: home } = trpc.dashboard.getHome.useQuery();
//
// // 获取经营智慧中心
// const { data: knowledge } = trpc.dashboard.getKnowledgeCenter.useQuery();
//
// // 获取经营画像
// const { data: portrait } = trpc.dashboard.getOwnerPortrait.useQuery();

// ============================================================
// 2. 流式 Agent 调用（SSE 方式）
// ============================================================

export async function streamAgentChat(params: {
  message: string;
  projectId: string;
  conversationId?: string;
  onText: (text: string) => void;
  onThinking: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  const response = await fetch("/api/agent/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: params.message,
      projectId: params.projectId,
      conversationId: params.conversationId,
    }),
  });

  if (!response.ok) {
    params.onError(`HTTP ${response.status}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    params.onError("无法读取响应流");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        // 事件类型
        const eventType = line.slice(7).trim();
        continue;
      }
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          
          switch (data.type) {
            case "text":
              params.onText(data.content);
              break;
            case "thinking":
              params.onThinking(data.content);
              break;
            case "done":
              params.onDone();
              break;
            case "error":
              params.onError(data.message);
              break;
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }
}

// ============================================================
// 3. React Hook 封装示例
// ============================================================

// import { useState, useCallback } from "react";
//
// export function useAgentChat(projectId: string) {
//   const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
//   const [isStreaming, setIsStreaming] = useState(false);
//
//   const sendMessage = useCallback(async (message: string) => {
//     setMessages((prev) => [...prev, { role: "user", content: message }]);
//     setIsStreaming(true);
//
//     let aiResponse = "";
//
//     await streamAgentChat({
//       message,
//       projectId,
//       onText: (text) => {
//         aiResponse += text;
//         setMessages((prev) => {
//           const last = prev[prev.length - 1];
//           if (last?.role === "assistant") {
//             return [...prev.slice(0, -1), { role: "assistant", content: aiResponse }];
//           }
//           return [...prev, { role: "assistant", content: aiResponse }];
//         });
//       },
//       onThinking: () => {},
//       onDone: () => setIsStreaming(false),
//       onError: (err) => {
//         setMessages((prev) => [...prev, { role: "assistant", content: `错误: ${err}` }]);
//         setIsStreaming(false);
//       },
//     });
//   }, [projectId]);
//
//   return { messages, sendMessage, isStreaming };
// }

// ============================================================
// 4. API 端点速查
// ============================================================

export const API_ENDPOINTS = {
  // tRPC 端点
  trpc: "/api/trpc",
  
  // 流式 Agent
  agentStream: "/api/agent/stream",
} as const;
