/**
 * M-ED 六步蓝图 — 股权战略设计
 * 厚资产由 consulting/*-engine 提供
 */
import {
  SixStepId,
  type AgentConsultingBlueprint,
  type ResearchPack,
} from "../../consulting-os/types";
import {
  applyGenericVote,
  openGenericWarRoom,
} from "../../consulting-os/meeting";
import { buildHeuristicEquityScan } from "./equity-scan-engine";
import { buildMedAdvisorsWithSchemes } from "./governance-scheme-engine";
import { buildMedExecutionRoadmap } from "./governance-pack-engine";
import { buildEquityStrategyReport } from "./equity-strategy-report";

const ADVISORS = [
  {
    id: "capital",
    name: "资本顾问",
    model: "融资与估值",
    question: "本轮融资要换什么？",
    initial: "资",
    toneClass: "bg-[#141413] text-white",
  },
  {
    id: "founder",
    name: "创始人视角",
    model: "控制权",
    question: "你还能不能拍板？",
    initial: "创",
    toneClass: "bg-[#5f6b4e] text-white",
  },
  {
    id: "risk",
    name: "风险顾问",
    model: "合规与争议",
    question: "哪会炸？",
    initial: "风",
    toneClass: "bg-[#3d4a5c] text-white",
  },
  {
    id: "govern",
    name: "治理顾问",
    model: "机制与激励",
    question: "人能不能留下来一起干？",
    initial: "治",
    toneClass: "bg-[#6b5a4e] text-white",
  },
] as const;

export const medBlueprint: AgentConsultingBlueprint = {
  agentId: "m-ed",
  productName: "组织与股权",
  committeeName: "组织顾问",
  reportTitle: "股权战略设计报告",
  stepLabels: {
    [SixStepId.INTAKE]: { no: "01", title: "说清楚", feel: "结构卡在哪" },
    [SixStepId.RESEARCH]: { no: "02", title: "体检", feel: "先看股权现状" },
    [SixStepId.ADVISORS]: { no: "03", title: "四顾问", feel: "各自出方案" },
    [SixStepId.WAR_ROOM]: { no: "04", title: "开会", feel: "控制权拍板" },
    [SixStepId.STRATEGY_LOCK]: { no: "05", title: "确认", feel: "方案定了" },
    [SixStepId.EXECUTION_PATH]: { no: "06", title: "怎么落", feel: "协议与节奏" },
  },
  intakeQuestions: [
    {
      id: "stage",
      prompt: "公司/项目处在哪一段？",
      choices: [
        { label: "创业初期", text: "创业初期，人刚凑齐" },
        { label: "准备融资", text: "准备融资或已经在谈" },
        { label: "要扩合伙", text: "要扩核心合伙 / 激励骨干" },
      ],
    },
    {
      id: "topic",
      prompt: "这次最想解决？",
      choices: [
        { label: "融资稀释", text: "融资会不会稀释失控" },
        { label: "合伙人公平", text: "合伙人怎么分才公平且能干活" },
        { label: "骨干激励", text: "骨干期权/股权怎么设" },
      ],
    },
    {
      id: "control",
      prompt: "你对控制权的底线？",
      choices: [
        { label: "必须控股", text: "必须保持控股与最终拍板" },
        { label: "可相对控股", text: "可相对控股，但关键事项一票否决" },
        { label: "可让渡部分", text: "可让渡部分控制权换增长" },
      ],
    },
    {
      id: "team",
      prompt: "核心团队现状？",
      choices: [
        { label: "2-3 创始", text: "2–3 位创始人主创" },
        { label: "有职业经理人", text: "已有职业经理人需激励" },
        { label: "人还不齐", text: "关键岗位还没齐" },
      ],
    },
  ],
  advisors: [...ADVISORS],

  buildResearch(answers): ResearchPack {
    return buildHeuristicEquityScan(answers);
  },

  buildAdvisors(answers, research) {
    return buildMedAdvisorsWithSchemes(answers, research);
  },

  buildWarRoom(advisors) {
    return openGenericWarRoom(advisors, {
      hostIntro:
        "股权治理委员会开会。四方亮方案：先锁控制权 / 先补协议 / 先设激励 / 融资缓冲——质询、反驳、改策后由老板拍板。",
      agendaTitle: "控制权与治理拍板会 · 有议程、有质询、有反驳、有决议",
      decision: {
        title: "治理拍板决策卡",
        subtitle: "四案互斥：融资缓冲 · 控制权底线 · 协议退出 · 激励池",
        question: "本轮股权治理，哪一条必须先锁死？",
        blendHint:
          "折中例：主轴锁创始人控制权底线；风险顾问的协议清单必须同步；激励池比例后置但不取消。",
        rule: "没有控制权底线与必须落签文件清单，不能散会。",
      },
      seats: ADVISORS.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.initial,
      })),
    });
  },

  applyVote(room, advisors, preference, blendNote) {
    const name = (id: string) =>
      ADVISORS.find((a) => a.id === id)?.name || id;
    return applyGenericVote(room, advisors, preference, name, blendNote);
  },

  buildReportMarkdown({ projectName, answers, research, advisors, warRoom }) {
    return buildEquityStrategyReport({
      projectName,
      answers,
      research,
      advisors,
      warRoom,
      advisorName: (id) => ADVISORS.find((a) => a.id === id)?.name || id,
    });
  },

  buildRoadmap(oneLiner, answers) {
    return buildMedExecutionRoadmap({ oneLiner, answers });
  },
};
