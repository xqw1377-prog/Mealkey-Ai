# API 文档

## tRPC Routers

所有 tRPC 路由通过 `POST /api/trpc/[router].[procedure]` 调用。

### projectRouter

| Procedure | 输入 | 说明 |
|-----------|------|------|
| `project.list` | 无 | 获取当前用户的所有活跃项目 |
| `project.getById` | `{ id: string }` | 获取单个项目详情 |
| `project.create` | `{ name, stage?, city?, category?, target?, budget?, profile? }` | 创建新项目 |
| `project.update` | `{ id, name?, stage?, ... }` | 更新项目字段 |
| `project.delete` | `{ id }` | 删除项目 |

### reportRouter

| Procedure | 输入 | 说明 |
|-----------|------|------|
| `report.list` | `{ projectId }` | 获取项目报告列表 |
| `report.getById` | `{ id }` | 获取单个报告 |
| `report.create` | `{ projectId, type, title, summary?, content?, status? }` | 创建报告 |
| `report.delete` | `{ id }` | 删除报告 |

### knowledgeRouter

| Procedure | 输入 | 说明 |
|-----------|------|------|
| `knowledge.categories` | 无 | 获取知识库分类树 |
| `knowledge.search` | `{ query, categoryId?, limit? }` | 搜索知识节点 |

### userRouter

| Procedure | 输入 | 说明 |
|-----------|------|------|
| `user.getProfile` | 无 | 获取当前用户信息 |

### memoryRouter

| Procedure | 输入 | 说明 |
|-----------|------|------|
| `memory.listByProject` | `{ projectId, type?, limit? }` | 项目记忆列表 |
| `memory.listByUser` | `{ type?, limit? }` | 用户记忆列表 |
| `memory.create` | `{ key, value, type?, source?, importance?, projectId? }` | 创建记忆 |
| `memory.delete` | `{ id }` | 删除记忆 |
| `memory.decisions` | `{ projectId, type?, limit? }` | 项目决策历史 |

### agentRouter

| Procedure | 输入 | 说明 |
|-----------|------|------|
| `agent.sendMessage` | `{ projectId, message, conversationId? }` | 发送消息给 Agent（返回 conversationId） |
| `agent.conversations` | `{ projectId?, limit? }` | 获取对话列表 |
| `agent.conversation` | `{ id }` | 获取对话详情 |

### dashboardRouter

| Procedure | 输入 | 说明 |
|-----------|------|------|
| `dashboard.getData` | `{ projectId }` | 获取仪表盘数据 |

## REST API

### POST /api/agent/stream

流式调用 Agent，返回 SSE (Server-Sent Events)。

**请求**:
```json
{
  "message": "帮我分析一下当前项目的最大风险",
  "projectId": "hangzhou-xiangcai",
  "conversationId": "optional"
}
```

**响应**: SSE 流
```
event: text
data: {"type":"text","content":"分析结果..."}

event: tool_start
data: {"type":"tool_start","toolName":"diagnoseOperation"}

event: done
data: {"type":"done"}
```

### GET /api/system/status

系统状态检查。

**响应**:
```json
{
  "status": "ok",
  "version": "0.2.0",
  "database": {
    "users": 1,
    "owners": 1,
    "projects": 2,
    "decisions": 0,
    "memories": 0,
    "knowledgeNodes": 3
  },
  "runtime": {
    "available": true,
    "registrySize": 1
  }
}
```
