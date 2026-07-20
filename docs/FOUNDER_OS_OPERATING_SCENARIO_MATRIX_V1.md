# Founder OS 第一版经营场景矩阵 V1.0

> 从「咨询能力系统」进入「老板每天真实决策系统」  
> 配置：`founder-os/scenarios/`  
> 运行时：`packages/agents/src/founder-os/scenarios/`  
> 目标：回答「老板为什么每天打开它」

---

## 核心问题

若只在「想咨询时」打开 → 频率太低。  
真正的企业 OS 必须嵌入 **经营过程中的关键决策节点**。

---

## 六类重大经营决策地图

```text
战略方向 → 市场选择 → 品牌定位 → 产品设计
  → 商业模型 → 组织资本 → 持续优化
```

| 经营问题 | 调用系统 |
|---|---|
| 我要不要做这个项目 | 七常委 |
| 我要进入哪个市场 | M-MKT + 七常委 |
| 品牌怎么定位 | M-PNT |
| 产品怎么设计 | M-PNT + M-BIZ |
| 店能不能赚钱 | M-BIZ |
| 怎么融资扩张 | M-ED + 七常委 |
| 怎么解决经营问题 | COO + 常委 |

---

## 六大场景（V1 冻结）

| ID | 场景 | 默认引擎 | 常委会 | 级别 |
|---|---|---|---|---|
| `startup_launch` | 创业立项 | 四大全开 | 高价值低频 | L3–L4 |
| `expansion` | 扩张决策 | 四大 + Expansion Council | 高危 | L2–L3 |
| `brand_upgrade` | 品牌升级 | 主 M-PNT | 中频 | L2–L3 |
| `new_product` | 新品决策 | M-MKT/PNT/BIZ + COO | **高频** | L1–L2 |
| `ops_anomaly` | 经营异常诊断 | 按异常调度 | **高频入口** | L2 |
| `fundraising_equity` | 融资与股权 | 主 M-ED + 七常委 | 低频高利害 | L4 |

详细合约见 `founder-os/scenarios/*.yaml`。

---

## 产品形态（非聊天）

| 节奏 | 形态 |
|---|---|
| 每天 | **Today Decision**（异常告警 → 建议开会） |
| 每周 | 经营会议（3 个关键问题） |
| 每月 | 战略复盘（战略/市场/品牌/商业/资本/风险） |
| 每季 | 董事会模拟 |

价值主张：不是教老板做菜，而是 **看清问题、做对选择、持续进化**。

---

## API

```text
classifyOperatingScenario(question | signals)
getScenario(id)
planScenarioRun(scenario) → engines + council + cadence
openScenarioSession(...) → 接到 conveneCouncilMeeting
```

---

## 下一步

**Chief of Staff Agent V1.0** —— Founder OS 中央操作大脑：发现问题、提交议题、调度专家、组织会议、跟踪执行、管理企业记忆。有了它，系统才真正闭环。
