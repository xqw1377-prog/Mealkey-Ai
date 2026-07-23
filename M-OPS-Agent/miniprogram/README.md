# MealKey Mini Shell · 微信小程序

**在本仓完成母体**（暂不独立开仓）。

## 已拉通

```text
Tab：首页 · 能力 · 大脑 · 我的
  → openAgent(restaurant-diagnosis)
  → Brain / Token / 裂变 / 云同步队列
```

## 接线（可选）

在 `app.js` → `globalData`：

```js
authApiUrl: "http://127.0.0.1:8787",
brainApiUrl: "http://127.0.0.1:8787",
marketplaceUrl: "", // 空则用 host/marketplace.sample.js
```

并启动：`npm run backend:server`（需 token 时带上；上述两路由已公开）。

## 校验

```bash
npm run mp:verify
```

详见 `docs/MEALKEY_MINI_SHELL_EXTRACT_V1.md`。
