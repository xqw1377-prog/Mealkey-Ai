# MealKey · M-MKT · 专业模型

**餐饮市场机会分析引擎** — 专业判断结构 v1.0.0

---

## 项目概述

M-MKT 定义一套通用的 **专业判断结构 (Professional Judgment Framework)**，核心包含：

- **六维模型** — 六个维度的标准化评估体系
- **机会评分** — 基于六维模型的加权量化评分系统 (0-5)
- **数据源无关** — 框架独立于具体数据源，后续可接入城市画像、平台数据、案例库

> **关键设计原则**：本版本定义"专业判断结构"，不限定具体数据源。后续可以把城市画像、平台数据与案例库逐步接入，但不改变六维模型与机会评分的表达方式。

## 架构

```
M-MKT/
├── src/                    # 源码
│   ├── core/               # 核心模块
│   │   ├── models.py       # 数据模型: SixDimensionModel, Dimension, Indicator
│   │   ├── scoring.py      # 评分引擎: 归一化、评估、空模型创建
│   │   ├── registry.py     # 维度注册表: 管理维度定义模板
│   │   ├── serializer.py   # 序列化器: JSON/dict 导入导出
│   │   ├── engine.py       # 机会决策引擎: IndicatorScorer, OpportunityEngine
│   │   ├── api.py          # 统一入口: MKTEngine
│   │   ├── cli.py          # 命令行工具
│   │   ├── exceptions.py   # 统一异常体系
│   │   └── dimension_definitions.py  # 餐饮六维模型业务定义
│   │   └── knowledge/      # 知识资产
│   │       ├── category.py    # 品类知识卡模型
│   │       ├── city.py        # 城市画像模型
│   │       ├── case.py        # 案例研究模型
│   │       ├── rules.py       # 规则引擎
│   │       └── data/          # 知识数据
│   │           ├── category_cards.py  # 10个品类
│   │           ├── city_profiles.py   # 10个城市
│   │           ├── case_studies.py    # 5个案例
│   │           └── judgment_rules.py  # 10条规则
│   ├── adapters/           # 数据源适配器层（预留）
│   │   ├── base.py         # BaseAdapter 抽象基类
│   │   ├── city_profile.py # 城市画像适配器（预留）
│   │   ├── platform_data.py # 平台数据适配器（预留）
│   │   └── case_library.py # 案例库适配器（预留）
│   └── utils/              # 工具函数
├── tests/                  # 测试 (249 用例)
│   ├── test_models.py      # 数据模型测试
│   ├── test_scoring.py     # 评分引擎测试
│   ├── test_registry.py    # 注册表测试
│   ├── test_definitions.py # 六维定义测试
│   ├── test_serializer.py  # 序列化测试
│   ├── test_engine.py      # 决策引擎测试 (含30指标验证)
│   ├── test_api.py         # API 入口测试
│   ├── test_knowledge.py   # 知识资产测试
│   ├── test_adapters.py    # 适配器测试
│   ├── test_exceptions.py  # 异常测试
│   └── test_helpers.py     # 工具函数测试
├── docs/                   # 文档
│   ├── 专业判断结构.md      # 专业判断结构定义
│   ├── 六维模型规范.md      # 六维模型规范
│   └── 技术接口规范_v1.0.0.md # 技术接口规范
├── pyproject.toml          # 项目配置
├── setup.py                # 安装配置
└── Makefile                # 构建命令
```

## 快速开始

```python
from core import MKTEngine

# 初始化引擎（加载知识资产、注册六维模型）
engine = MKTEngine()

# 分析咖啡品类在上海的市场机会
decision = engine.analyze("咖啡", "上海", experience="丰富", capital_level="high")

print(f"机会评分: {decision.opportunity_score:.2f}")
print(f"机会等级: {decision.opportunity_level}")
print(f"策略建议: {decision.positioning_suggestions}")
```

### 命令行

```bash
# 分析咖啡在上海的机会
python -m core.cli 咖啡 上海

# 分析火锅在成都的机会（首次创业，资金有限）
python -m core.cli 火锅 成都 --experience 首次创业 --capital low

# 列出所有品类和城市
python -m core.cli --list-categories
python -m core.cli --list-cities

# JSON 格式输出
python -m core.cli 湘菜 --json
```

## 六维模型

| 维度 | 名称 | 权重 | 核心评估问题 | 指标数 |
|------|------|------|-------------|--------|
| D1 | **市场容量** | 0.25 | 这个市场有多大？还能长多大？ | 5 |
| D2 | **竞争格局** | 0.20 | 这个市场竞争有多激烈？还有没有位置？ | 5 |
| D3 | **消费适配** | 0.20 | 这里的消费者吃这一套吗？ | 5 |
| D4 | **运营可行性** | 0.15 | 这个生意做得起来吗？供应链撑得住吗？ | 5 |
| D5 | **品牌势能** | 0.10 | 这个品牌能打赢吗？有什么核心优势？ | 5 |
| D6 | **环境适配** | 0.10 | 大环境支持吗？政策、趋势、风险如何？ | 5 |

> 六个维度通过 **DimensionRegistry** 统一管理，权重之和为 1.0。
> 每个维度配 5 个核心指标，构成完整的专业判断结构。

## 评分体系

| 维度得分 | 等级 | 机会评分 | 等级 |
|----------|------|----------|------|
| 4.0 - 5.0 | 优秀 | 3.5 - 5.0 | 高机会 |
| 3.0 - 4.0 | 良好 | 2.0 - 3.5 | 中机会 |
| 2.0 - 3.0 | 一般 | 0.0 - 2.0 | 低机会 |
| 1.0 - 2.0 | 较弱 | | |
| 0.0 - 1.0 | 差 | | |

## 工程命令

```bash
make test       # 运行测试 (249 用例)
make lint       # 代码检查
make check      # 完整检查（lint + test + coverage）
make clean      # 清理缓存
```

## 使用命令行

```bash
# 分析品类市场机会
python -m core.cli 咖啡 上海

# 带创业者参数
python -m core.cli 火锅 成都 --experience 首次创业 --capital low

# 列出知识资产
python -m core.cli --list-categories
python -m core.cli --list-cities

# JSON 输出
python -m core.cli 湘菜 --json
```

## 设计原则

1. **专业判断优先** — 结构基于餐饮市场领域专业知识定义
2. **数据源解耦** — 框架不绑定任何特定数据源
3. **渐进增强** — 先定义结构，再逐步接入数据
4. **表达稳定** — 六维模型与机会评分的表达方式不随数据源变化
5. **可测试** — 核心逻辑 100% 单元测试覆盖

## 版本

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0.0 | 待定 | 初始工程化版本：六维模型 + 评分引擎 + 知识资产(10品类/10城市/5案例/10规则) + 决策引擎 + CLI |
