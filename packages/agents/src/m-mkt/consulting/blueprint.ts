/**
 * M-MKT 六步蓝图 — 市场机会战略
 * 厚资产由 consulting/*-engine 提供；本文件管人设、门控与接线
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
import { buildHeuristicMarketScan } from "./market-scan-engine";
import { buildMmktAdvisorsWithSchemes } from "./entry-scheme-engine";
import { buildMmktExecutionRoadmap } from "./entry-pack-engine";
import { buildOpportunityStrategyReport } from "./opportunity-strategy-report";

const ADVISORS = [
  {
    id: "strategy",
    name: "市场战略专家",
    model: "机会与进入",
    question: "值不值得进、怎么进？",
    initial: "战",
    toneClass: "bg-[#141413] text-white",
  },
  {
    id: "ops",
    name: "餐饮经营专家",
    model: "门店可兑现",
    question: "店里资源打得动吗？",
    initial: "经",
    toneClass: "bg-[#5f6b4e] text-white",
  },
  {
    id: "invest",
    name: "投资增长专家",
    model: "回报与节奏",
    question: "试点多久能验证？",
    initial: "投",
    toneClass: "bg-[#3d4a5c] text-white",
  },
] as const;

export const mmktBlueprint: AgentConsultingBlueprint = {
  agentId: "m-mkt",
  productName: "市场机会",
  committeeName: "市场顾问",
  reportTitle: "市场机会战略报告",
  stepLabels: {
    [SixStepId.INTAKE]: { no: "01", title: "说清楚", feel: "你想判断什么" },
    [SixStepId.RESEARCH]: { no: "02", title: "调研", feel: "先看市场事实" },
    [SixStepId.ADVISORS]: { no: "03", title: "三顾问", feel: "各自出方案" },
    [SixStepId.WAR_ROOM]: { no: "04", title: "开会", feel: "互相质询后拍板" },
    [SixStepId.STRATEGY_LOCK]: { no: "05", title: "确认", feel: "方案定了" },
    [SixStepId.EXECUTION_PATH]: { no: "06", title: "怎么干", feel: "试点路径" },
  },
  intakeQuestions: [
    {
      id: "city",
      prompt: "主战场城市/区域？",
      choices: [
        { label: "一线核心区", text: "一线城市核心商圈" },
        { label: "新一线主城", text: "新一线城市主城区" },
        { label: "本地深耕", text: "本地深耕、先打穿再扩张" },
      ],
    },
    {
      id: "category",
      prompt: "你看的品类/业态？",
      choices: [
        { label: "家常正餐", text: "家常正餐 / 堂食为主" },
        { label: "轻快餐", text: "轻快餐 / 高周转" },
        { label: "特色地方菜", text: "特色地方菜 / 差异化体验" },
      ],
    },
    {
      id: "intent",
      prompt: "这次最想判断什么？",
      choices: [
        { label: "能不能进", text: "判断这个市场值不值得进入" },
        { label: "怎么切", text: "判断从哪个客群/场景切入更稳" },
        { label: "跟谁打", text: "判断竞争格局与差异化空位" },
      ],
    },
    {
      id: "constraint",
      prompt: "当前最大约束？",
      choices: [
        { label: "预算紧", text: "预算有限，必须小步试点" },
        { label: "人手紧", text: "人手有限，不能铺太开" },
        { label: "时间紧", text: "要尽快验证，不能拖半年" },
      ],
    },
  ],
  advisors: [...ADVISORS],

  buildResearch(answers, ctx): ResearchPack {
    return buildHeuristicMarketScan(answers, ctx);
  },

  buildAdvisors(answers, research) {
    return buildMmktAdvisorsWithSchemes(answers, research);
  },

  buildWarRoom(advisors) {
    return openGenericWarRoom(advisors, {
      hostIntro:
        "市场战略委员会开会。三位顾问分别亮「能不能进 / 怎么切 / 验证节奏」进入方案；质询、反驳、改策后由老板拍板。",
      agendaTitle: "进入方式拍板会 · 有议程、有质询、有反驳、有决议",
      decision: {
        title: "进入方式决策卡",
        subtitle: "三案互斥：值不值得进 · 门店打不打得动 · 多久验证杀出",
        question: "本轮市场进入，主轴认哪一条？",
        blendHint:
          "折中例：主轴用战略专家的场景切口；经营专家只定菜单与班次护栏；投资专家只管杀出线。",
        rule: "没有进入主轴与杀出线，不能散会。",
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

  buildReportMarkdown({
    projectName,
    city,
    answers,
    research,
    advisors,
    warRoom,
  }) {
    return buildOpportunityStrategyReport({
      projectName,
      city,
      answers,
      research,
      advisors,
      warRoom,
      advisorName: (id) => ADVISORS.find((a) => a.id === id)?.name || id,
    });
  },

  buildRoadmap(oneLiner, answers) {
    return buildMmktExecutionRoadmap({ oneLiner, answers });
  },
};
