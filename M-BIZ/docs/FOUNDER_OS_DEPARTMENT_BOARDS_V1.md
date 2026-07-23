# Founder OS 四部门看板打磨说明

> 日期：2026-07-14  
> 配套：`FOUNDER_OS_MEETING_SYSTEM_V1.md` · `department-board.ts` · `DepartmentBoardShell`

## 原则

1. **Agent 不是产品** — 前台只见「品牌定位部 / 市场研究部 / 商业战略部 / 组织设计部」  
2. **看板服务于会议** — 每页唯一主 CTA = 进入对应部门会议（带 `?dept=`）  
3. **判断优先于分数** — 健康度/概率降为次级，不占第一屏主角  
4. **专家可见** — 页头展示该部门顾问席  

## 工程入口

| 文件 | 作用 |
|------|------|
| `lib/department-board.ts` | 四部门配置、会议深链、产品名剥离 |
| `lib/board-labels.ts` | 协议英文标签 → 中文 |
| `components/operating/DepartmentBoardShell.tsx` | 统一页头壳 |
| `components/operating/CollapsibleBoardSection.tsx` | 次要区块默认折叠 |

| 看板 | 路由 | key | 会议 dept |
|------|------|-----|-----------|
| 品牌定位委员会 | `/positioning` | brand | brand → m-pnt |
| 市场机会评估 | `/market` | market | market → m-mkt |
| 商业模式评审 | `/business` | business | business → chief |
| 组织与股权设计 | `/equity` | org | org → m-ed |

## 80 分验收标准（本轮）

- 首屏：Shell（议题 + 判断 + 唯一开会 CTA）+ 折叠条标题，不铺开协议墙  
- 工作台 / 协议 / 账本 / 结果委员会默认折叠  
- 有结果时，机会判断卡可保留展开（市场）；定位结果块可有条件展开  
- 用户可见文案无 M-XX、无协议英文 eyebrow  
- Shell 下方无第二个黑底「进入会议」主按钮  

## 已完成（约 80 分）

- 四页接入 `DepartmentBoardShell` + 提示语「正式判断在会议里完成…」  
- 会议链接统一 `getDepartmentMeetingHref`  
- 用户文案剥离 M-XX（`stripAgentProductNames`）  
- 访谈 / 旅程 / 协议 / 账本 / 委员会结果区收入 `CollapsibleBoardSection`  
- 英文协议标签中文化（Mission、Tradeoff、Brand Brief、Market Context 等）  
- 定位：结果区 / 本轮过程 / 档案折叠；去掉页底重复「AI 战略会议」叙事标题  
- 市场：分数降权；委员会与顾问侧栏折叠  
- 商业 / 组织：结果委员会折叠；组织侧栏顾问折叠  
- **组织页冲 90**：三栏改单列（对齐商业页）；删除未挂载 `GovernanceMapCard` / `GovernanceMeetingPanel` / `DecisionFrame`；快捷追问与运行信息收入折叠区  

## 后续（可选，冲 90）

- 看板内 intake 进一步弱化为「补充事实」节点  
- M-BIZ 接入独立 forceAgent stream  
- 组织页三栏改单列，进一步贴近商业页骨架  
- 死代码清理（未挂载的 MapCard / MeetingPanel）  
- MeetingSession 持久化 + Gateway 真并行顾问  
