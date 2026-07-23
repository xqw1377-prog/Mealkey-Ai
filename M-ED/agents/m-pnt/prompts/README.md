# M-PNT Prompt 体系

定义见 [docs/M-PNT-Prompt体系设计文档-V1.md](../docs/M-PNT-Prompt体系设计文档-V1.md)  
三理论矩阵见 [docs/M-PNT-三理论Agent矩阵设计-V1.md](../docs/M-PNT-三理论Agent矩阵设计-V1.md)

## 执行顺序

```text
00-system
  → 01-situation-insight        # 含六维诊断
  → 02-position-generate        # 3–5 候选
  → 03a-ries | 03b-trout | 03c-ye   # 并行
  → 04-cross-fire
  → 05-synthesis                # decision_recommend
  → 06-quality-check
  → 07-final-output
```

## 文件索引

| 文件 | 职责 |
|---|---|
| `00-system.md` | 总控 |
| `01-situation-insight.md` | 项目解析 + 六维 |
| `02-position-generate.md` | 候选方向 |
| `03a-ries-agent.md` | 第一/聚焦/领导 |
| `03b-trout-agent.md` | 竞争/区隔/联想 |
| `03c-ye-maozhong-agent.md` | 场景/落地/传播 |
| `04-cross-fire.md` | 碰撞，非平均 |
| `05-synthesis.md` | primary 等取舍 |
| `06-quality-check.md` | 质量门禁 |
| `07-final-output.md` | M-Solution |
| `protocols/input-package.md` | 统一输入 |
| `protocols/theory-view-output.md` | 统一理论输出 |
| `protocols/recommendation-mapping.md` | 双轨等级映射 |

## 知识挂载

| Prompt | 优先知识资产 |
|---|---|
| System | Theory Rules + Output Schemas |
| Position | Patterns + Mental |
| Ries | Theory(ries) + Patterns(leadership) |
| Trout | Theory(trout) + Competition + Mental |
| Ye | Theory(ye) + Mental + Case(china) |
| Cross-Fire | Challenge Rules |
| Final | Output Schemas |
