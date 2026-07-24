/**
 * M-BIZ 六步蓝图 — 商业模式战略
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
import { buildHeuristicBusinessScan } from "./business-scan-engine";
import { buildMbizAdvisorsWithSchemes } from "./mode-scheme-engine";
import { buildMbizExecutionRoadmap } from "./mode-pack-engine";
import { buildModeStrategyReport } from "./mode-strategy-report";

const ADVISORS = [
  {
    id: "strategy",
    name: "战略官",
    model: "路径选择",
    question: "先利润、增长还是品牌？",
    initial: "战",
    toneClass: "bg-[#141413] text-white",
  },
  {
    id: "product",
    name: "产品官",
    model: "供给结构",
    question: "产品能不能证明模式？",
    initial: "产",
    toneClass: "bg-[#5f6b4e] text-white",
  },
  {
    id: "finance",
    name: "财务官",
    model: "单位经济",
    question: "单店经济模型通不通？",
    initial: "财",
    toneClass: "bg-[#3d4a5c] text-white",
  },
  {
    id: "ops",
    name: "运营官",
    model: "可复制",
    question: "流程能不能复制？",
    initial: "运",
    toneClass: "bg-[#6b5a4e] text-white",
  },
] as const;

export const mbizBlueprint: AgentConsultingBlueprint = {
  agentId: "m-biz",
  productName: "商业模式",
  committeeName: "商业顾问",
  reportTitle: "商业模式战略报告",
  stepLabels: {
    [SixStepId.INTAKE]: { no: "01", title: "说清楚", feel: "生意卡在哪" },
    [SixStepId.RESEARCH]: { no: "02", title: "体检", feel: "先看赚钱逻辑" },
    [SixStepId.ADVISORS]: { no: "03", title: "四顾问", feel: "各自出方案" },
    [SixStepId.WAR_ROOM]: { no: "04", title: "会商", feel: "取舍后拍板" },
    [SixStepId.STRATEGY_LOCK]: { no: "05", title: "确认", feel: "方案定了" },
    [SixStepId.EXECUTION_PATH]: { no: "06", title: "怎么验", feel: "90 天验证" },
  },
  intakeQuestions: [
    {
      id: "stage",
      prompt: "店/品牌现在处在哪一段？",
      choices: [
        { label: "验证期", text: "还在验证单店能不能跑通" },
        { label: "盈利期", text: "单店能赚钱，想稳住再扩" },
        { label: "扩张期", text: "准备复制多店 / 融资扩张" },
      ],
    },
    {
      id: "pain",
      prompt: "商业模式上最头疼的是？",
      choices: [
        { label: "赚钱但不稳", text: "能赚钱但不稳，波动大" },
        { label: "增长很贵", text: "要增长就要砸很多钱" },
        { label: "复制不了", text: "单店还行，一复制就走样" },
      ],
    },
    {
      id: "priority",
      prompt: "未来 90 天更优先？",
      choices: [
        { label: "先利润", text: "先把利润做稳" },
        { label: "先增长", text: "先把规模与流量做起来" },
        { label: "先品牌", text: "先把定位与品牌资产做穿" },
      ],
    },
    {
      id: "resource",
      prompt: "最紧的资源是？",
      choices: [
        { label: "现金", text: "现金紧" },
        { label: "人", text: "关键岗位招不到/留不住" },
        { label: "时间", text: "老板时间被日常淹没" },
      ],
    },
  ],
  advisors: [...ADVISORS],

  buildResearch(answers): ResearchPack {
    return buildHeuristicBusinessScan(answers);
  },

  buildAdvisors(answers, research) {
    return buildMbizAdvisorsWithSchemes(answers, research);
  },

  buildWarRoom(advisors) {
    return openGenericWarRoom(advisors, {
      hostIntro:
        "商业顾问委员会开议。四官亮主航道方案：利润 / 增长 / 品牌优先与落地护栏；质询、反驳、改策后由老板定 90 天主轴。"
      agendaTitle: "路径取舍拍板会 · 有议程、有质询、有反驳、有决议",
      decision: {
        title: "主航道决策卡",
        subtitle: "四官互斥：战略优先级 · 产品证明 · 单位经济 · 可复制护栏",
        question: "未来 90 天，商业模式主航道认哪一席？",
        blendHint:
          "折中例：主轴认战略官的优先级；财务官设杀出线；产品/运营只做证明与流程护栏。",
        rule: "没有唯一北极星不能结束会商。三线并行等于没决策。",
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
    return buildModeStrategyReport({
      projectName,
      answers,
      research,
      advisors,
      warRoom,
      advisorName: (id) => ADVISORS.find((a) => a.id === id)?.name || id,
    });
  },

  buildRoadmap(oneLiner, answers) {
    return buildMbizExecutionRoadmap({ oneLiner, answers });
  },
};
