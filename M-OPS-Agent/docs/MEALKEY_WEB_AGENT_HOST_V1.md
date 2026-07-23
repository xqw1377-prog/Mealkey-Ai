# MealKey Web Agent Host V1

# 本仓 `web/` 角色冻结（非 Mini Shell）

> **版本：** V1.0  
> **日期：** 2026-07-22  
> **状态：冻结**  
> **配套：** `MEALKEY_MINI_SHELL_AGENT_PLUGIN_V1.md` · `MEALKEY_AGENT_MINIPROGRAM_PLATFORM_V1.md` · `M_OPS_DIAG_AGENT_V1.md`

---

## 0. 一句话

> **微信 Mini Shell = 1 入口 · N Agent 获客平台**  
> **本仓 `web/` = 餐厅经营体检（单 Agent）的 Web 宿主 / 可嵌经营大脑的 atelier**  
> **MealKey OS Web（外仓 `/dashboard`）= 经营大脑看板本体**

三者不要混成一套前端框架。

---

## 1. 要不要按 Mini Shell 优化？

| 做法 | 裁决 |
|------|------|
| 在 `web/` 复制 Shell 四 Tab（能力/大脑/我的/Token） | **不做** |
| 在 `web/` 做 Marketplace / 第二 Agent 路由 | **不做**（留给小程序 + 真经营大脑） |
| CTA / 文案对齐「进入经营大脑」 | **要做** |
| 轻拆：壳层 chrome vs Agent 旅程 vs OS 桥接 | **要做（渐进）** |
| 把 `App.tsx` 上帝组件一次拆完 | 可分步，非阻塞 |

---

## 2. 本仓 Web 应优化什么

1. **边界清晰**：标题与导航是「体检 Agent」，出口是经营大脑，不是「再下一个 App」  
2. **Brain 桥接统一**：`shell/os-bridge.ts` → dashboard / Today；禁止满页「下载 App」主推  
3. **会话门面（下一步）**：backend / archive 收敛为 `getRestaurant / publishRun` 语义，与小程序 Brain 同构  
4. **可嵌 OS**：保持可被母体 iframe/路由挂载；深链可选  

---

## 3. 与小程序的关系

```text
老板扫码 → Mini Shell → restaurant-diagnosis（首价值）
                ↓
         进入经营大脑（OS Web / App）
                ↓
         需要时再打开本仓 web atelier（深检/会审桌面态）
```

本仓 `web/` **不是**获客主入口；获客主入口是微信 Mini Shell。

---

## 4. 落地状态

- 2026-07-22：角色冻结；`shell/os-bridge.ts` + CTA 对齐经营大脑  
- `shell/useDiagnosisSession.ts` 已接入 `App.tsx`（会话三态收敛）  
- 目录整迁 `agents/restaurant-diagnosis/` 仍为可选（非阻塞）  
