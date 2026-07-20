# Founder OS 七常委知识资产体系 V1.0

> 把 AI 的无限知识压缩成企业可调用的判断能力  
> 配置：`founder-os/knowledge/`  
> 运行时：`packages/agents/src/founder-os/knowledge/`  
> 备注：商业常委 ID = **BMO**（非文档笔误中的第二个 CBO）

---

## 为什么比普通 AI 强？

不是模型更大，而是：

**专业知识资产 + 判断框架 + 历史经验 + 企业记忆**

顶级咨询机构的壁垒也不是顾问本人，而是几十年方法论与案例库。

---

## 总架构

```text
行业知识层
    ↓
方法论库 · 案例库 · 数据库
    ↓
判断模型层（框架 / 评分 / 风险 / 推理规则）
    ↓
Agent 人格层（七常委）
    ↓
企业记忆层（历史决策 / 成败 / Founder 偏好）
```

---

## 统一 Schema

```typescript
ExpertKnowledgeBase {
  methodology;      // 方法论库
  frameworks;       // 判断框架
  cases;            // 案例库
  benchmarks;       // Benchmark
  questions;        // 问题库
  failurePatterns;  // 失败模式
}
```

每位常委六大库缺一不可。知识不是静态：经 **Expert Learning Loop**（预测→执行→结果→偏差→更新）持续校准。

---

## 能力飞轮

```text
顶级咨询知识 → 专家 Agent → 企业决策 → 真实结果 → 企业经验 → 更强专家
```

三层能力：

1. 四大咨询 Agent — 专业分析  
2. 七常委 — 综合判断  
3. 知识资产系统 — 持续进化  

---

## 与会议引擎挂接

Round1 Prompt 注入：本席 `frameworks` + 相关 `failurePatterns` + 精选 `questions`。  
验证回写：偏差进入 `learning_adjustments`，影响后续敏感权重提示。

下一层建议：《Founder OS 第一版经营场景矩阵》——把能力接到餐饮老板真实决策日程。
