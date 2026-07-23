# M-OPS-Agent · 餐启 · 餐厅经营体检系统

外置独立 Agent 产品（**不在 MealKey Core 内新增**）。  
经 MealKey Agent Protocol / Gateway 接入经营大脑。

**系统中文名：** 餐厅经营体检系统  
**母体品牌：** 餐启 · Mealkey  
**官方 Agent ID：** `restaurant-diagnosis`  
**Manifest：** `maxInsightLevel: 3` · ports `signal|insight|gap`

## 结构

```text
M-OPS-Agent/
├── docs/                # 产品冻结文档
├── src/                 # Skill · Sandbox CLI · Gateway 硬闸 · 本地 Backend 旁路
├── web/                 # Agent Web 壳（可嵌 Mealkey）
├── miniprogram/         # 微信小程序独立壳（同一引擎）
└── packages/            # SDK / 诊断引擎
```

**微信生态：** 1 个 MealKey Mini Shell + N 个可插拔 Agent（本仓为 M-OPS 样板）；Brain 共享；经营大脑在 App/Web。详见 `docs/MEALKEY_MINI_SHELL_AGENT_PLUGIN_V1.md` · `docs/MEALKEY_AGENT_MINIPROGRAM_PLATFORM_V1.md`。  
**本仓 `web/`：** 单 Agent 宿主（非 Mini Shell、非经营大脑看板）；角色见 `docs/MEALKEY_WEB_AGENT_HOST_V1.md`。

## 快速开始

```bash
cd C:\Users\xqw13\M-OPS-Agent
npm install
npm test
npm run test:contracts
npm run web:dev
```

前端默认 http://localhost:5173，顶栏展示餐启 logo +「餐厅经营体检系统」。

### 微信小程序（独立可跑）

```bash
npm run mp:engine    # 打包诊断引擎到 miniprogram/libs/
npm run mp:verify    # 无微信工具时的引擎冒烟
```

用微信开发者工具打开目录 `miniprogram/`（MealKey Mini Shell；详见 `miniprogram/README.md`）。

### 本地 Backend 旁路（开发用）

默认绑定 `127.0.0.1:8787`，**不是**生产 HTTP 服务化。

```powershell
$env:M_OPS_BACKEND_TOKEN = "dev-local-token"
$env:VITE_BACKEND_TOKEN = "dev-local-token"
npm run backend:dev
```

另开终端：

```powershell
$env:VITE_BACKEND_URL = "http://localhost:8787"
$env:VITE_BACKEND_TOKEN = "dev-local-token"
npm run web:dev
```

采集默认 `M_OPS_COLLECTOR_MODE=synthetic`（确定性 fixture）。真实外采需 `live` + `registerLiveCollector`。

### 对接本地 MealKey Gateway

```powershell
$env:MK_GATEWAY_URL = "http://localhost:3000/api"
$env:MK_AGENT_SECRET = "<your-secret>"
$env:MK_AGENT_ID = "restaurant-diagnosis"
$env:MK_GATEWAY_MODE = "sandbox"
npm run run:sandbox
```

生产 Context 租用（须已安装）：

```powershell
$env:MK_GATEWAY_MODE = "production"
$env:MK_RESTAURANT_ID = "<restaurantId>"
$env:MK_USER_ACCESS_TOKEN = "<token>"
npm run run:sandbox
```

## 环境变量

见 `.env.example`。关键：`MK_GATEWAY_MODE` · `M_OPS_BACKEND_TOKEN` · `VITE_BACKEND_TOKEN` · `VITE_MK_USE_GATEWAY_CONTEXT`。

浏览器侧请勿依赖默认 Agent Secret；未配置 `VITE_MK_AGENT_SECRET` 时仅做本地诊断、跳过 Gateway 同步。

## 与 MealKey 的关系

- 本仓 = **独立产品**（餐厅经营体检系统）  
- 餐启母体 = Identity / Brain / Decision / Gateway / Store  
- 禁止直连 Prisma；未安装禁止静默读写生产 Gateway  

Host 侧接口文档以 MealKey 仓为准（本仓不 vendoring Host 文档）。
