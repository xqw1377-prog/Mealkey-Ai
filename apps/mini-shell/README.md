# MealKey Mini Shell（微信小程序）

> 真源：`docs/MEALKEY_MINI_PROGRAM_SHELL_AND_PLUGIN_RUNTIME_V1.md`  
> **1 个小程序 + N 个 Agent Plugin**（不是 N 个小程序）

## 工程切片

| 切片 | 状态 | 内容 |
|------|------|------|
| S1 | **本目录骨架** | 三 Tab（发现 / 我的能力 / 我的）· Auth 访客会话 · RestaurantBinder · PluginHost · 燃料展示 |
| S2 | **首发 Plugin** | `restaurant-diagnosis` 餐厅经营体检（原生 intake + 30% 预览报告 + 升级 CTA） |
| S3+ | 后置 | 真微信登录 · 经营点账本 · 有效用户裂变 · Marketplace Catalog |

契约 SSOT：`@mealkey/agent-sdk/mini-shell`  
BFF：`apps/web` → `/api/v1/mini-shell/*`

## 本地打开

1. 启动 MealKey Web（BFF）：在仓库根目录 `npm run dev`（或只起 `apps/web`）  
2. 用**微信开发者工具**导入本目录 `apps/mini-shell`（`project.config.json`）  
3. 详情 → 本地设置：勾选不校验合法域名（开发期）  
4. 默认 API：`http://127.0.0.1:3000/api/v1/mini-shell`（可在 Storage `mk_api_base` 覆盖）

无 BFF 时 Shell 会用离线 catalog / 本地 ShellContext 回落，仍可点通首发体检。

## 首发能力

- Agent ID：`restaurant-diagnosis`  
- 产品名：餐厅经营体检系统  
- 完整引擎仍在外置仓 `M-OPS-Agent`；Shell 内先交付获客漏斗与 Handoff，Gateway 深接后续加深。

## 主 CTA（冻结）

```text
进入 MealKey 经营大脑
```
