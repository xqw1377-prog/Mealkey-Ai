# MealKey Mini Shell 抽离就绪清单 V1

> **决策（2026-07-22）：** **直接在本仓开发完成** Shell 前端框架并拉通路径；体检为第一个 Agent。  
> 独立仓 `MealKey-Mini-Shell` **以后再拆**，当前禁止并行开仓。  
> **禁止：** 另起炉灶重写第二套母体小程序。

---

## 1. 本仓目标结构（抽离前）

```text
miniprogram/
├── shell/                 # → 未来独立仓主体
│   ├── api.js             # Agent 唯一依赖面
│   ├── auth.js / brain.js / wallet.js / mealkey-cta.js
│   └── pages/{home,capabilities,brain,me}
├── runtime/               # → 随 Shell 仓走
│   ├── api.js
│   ├── registry.js        # 无 Agent 硬编码
│   ├── open-agent.js / context.js / validate-manifest.js
├── host/                  # → 留在「组装宿主」（可仍是本仓）
│   └── plugin-catalog.js  # 唯一 require agents/*
├── agents/                # → 各 Agent 仓，本仓只留 restaurant-diagnosis
│   ├── restaurant-diagnosis/
│   └── m-pnt-brand/       # 占位
├── libs/                  # Agent 引擎产物
└── app.js                 # 宿主：registerPlugins(catalog)
```

**硬规则：** `shell/` · `runtime/` **不得** `require("../agents/...")`。

---

## 2. 抽离后双仓关系

```text
MealKey-Mini-Shell（新仓）
  shell + runtime + 微信工程壳
       ↑ registerPlugins(manifests)
M-OPS-Agent / 其他 Agent 仓
  agents/<id> + engines
  由组装宿主或 CI 把 Plugin 装进 Shell
```

首版也可：**Shell 仓 submodule / npm 包**，本仓 `miniprogram` 继续当组装宿主。

---

## 3. 完成度检查（抽离门槛）

| 项 | 状态 |
|----|------|
| S1 目录拆分 shell / agents | ✅ |
| S2 Context + Brain 跨页复用 | ✅ |
| S3 Token 欢迎金 + 流水可见 | ✅ |
| S4 第二 Agent 占位 | ✅ m-pnt-brand |
| S5 Manifest 校验 + 注册表解耦 | ✅ |
| shell/runtime 零 Agent 硬依赖 | ✅（经 host/plugin-catalog） |
| 真 wx.login / 云 Brain | ✅ 可接线（无后端降级；backend 提供 /wechat/session · /brain/sync） |
| 远程 Marketplace 拉取 | ✅ 样例合并 + marketplaceUrl 远程拉取 |
| 经营合伙人裂变 | ✅ 有效完诊发奖 + 邀请码 |
| Web useDiagnosisSession | ✅ 轻拆分已接入 App |

---

## 4. 建议抽离步骤（到点再做）

1. 新建空仓 `MealKey-Mini-Shell`，拷贝 `shell/` + `runtime/` + 最小 `app.js` 模板  
2. 本仓改为：依赖 Shell（path / submodule），保留 `host/` + `agents/` + `libs/`  
3. `app.json` pages：Shell 页 + 各 Agent 页由宿主合并  
4. 回归：`npm run mp:verify` + 微信开发者工具跑通体检主路径  

**现在不抽仓的原因：** 先把母体能力在样板 Agent 上跑稳，避免双仓同步税。

---

## 5. 一句话

> **先完成可抽离的 Shell，再搬仓；不是先搬仓再补能力。**
