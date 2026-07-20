# 四 Agent 六步咨询价值路径冻结

> 冻结日：2026-07-15  
> 权威参照：`docs/M_PNT_SIX_STEP_VALUE_PATH_FREEZE.md`  
> 原则：**过程可感价值 > 一枪出报告；主 UX = 六步，旧一枪引擎降为能力源。**

---

## 0. 统一六步（四席同构）

| 步 | 代号 | 用户感知 |
|----|------|----------|
| 1 | `INTAKE` | 它懂我的问题 |
| 2 | `RESEARCH` | 机构在调研/体检 |
| 3 | `ADVISORS` | 多顾问各出一策（有冲突） |
| 4 | `WAR_ROOM` | 我在会议室拍板 |
| 5 | `STRATEGY_LOCK` | 方案定了（可导出报告） |
| 6 | `EXECUTION_PATH` | 知道怎么干（时间轴） |

禁止：长时间填表 → 只甩 PDF。

---

## 1. 分席映射

### M-PNT（已落地）
采集 → 市场调研 → 里斯/特劳特/叶茂中 → 四方会 → 《定位策略报告》→ 90 天执行

### M-MKT（已落地）
| 步 | 内容 |
|----|------|
| INTAKE | 城市/品类/机会意图/约束（点选） |
| RESEARCH | 市场扫描报告（品类·消费·竞争·缺口） |
| ADVISORS | 市场战略 · 餐饮经营 · 投资增长 |
| WAR_ROOM | 进入方式分歧 → 老板拍板 |
| STRATEGY_LOCK | 《市场机会战略报告》 |
| EXECUTION_PATH | 试点→验证→放量 |

### M-BIZ（已落地）
| 步 | 内容 |
|----|------|
| INTAKE | 阶段/模式痛点/资源约束 |
| RESEARCH | 商业体检报告（规则·评分·主矛盾） |
| ADVISORS | 战略官 · 产品官 · 财务官 · 运营官 |
| WAR_ROOM | 路径取舍（利润/增长/品牌优先） |
| STRATEGY_LOCK | 《商业模式战略报告》 |
| EXECUTION_PATH | 验证任务 + 90 天行动 |

### M-ED（已落地）
| 步 | 内容 |
|----|------|
| INTAKE | 阶段/议题（融资·合伙·激励） |
| RESEARCH | 股权结构与风险扫描 |
| ADVISORS | 资本顾问 · 创始人视角 · 风险顾问 · 治理顾问 |
| WAR_ROOM | 控制权/激励/融资缓冲拍板 |
| STRATEGY_LOCK | 《股权战略设计报告》 |
| EXECUTION_PATH | 协议/vesting/融资节奏节点 |

---

## 2. 代码落点

```
packages/agents/src/consulting-os/              # 共享六步内核
packages/agents/src/m-mkt|m-biz|m-ed/consulting/
apps/web/.../AgentConsultingWorkspace.tsx       # 共享 UI（对齐 M-PNT 视觉）
apps/web/.../routers/agent-consulting.ts        # mMkt/mBiz/mEdConsulting
apps/web/.../market|business|equity/page.tsx    # 入口已切六步主路径
```

建设状态：四席同构六步主路径均已接通；换品牌清四席卷宗；调研/顾问优先投影一枪引擎（失败回退模板）；能力中心入口对齐六步文案；交付视觉与 M-PNT 同构（渐进揭示 / 报告封面 / 动效）。
