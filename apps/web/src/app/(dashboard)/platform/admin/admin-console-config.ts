import {
  BookMarked,
  BrainCircuit,
  CircleDollarSign,
  ClipboardCheck,
  Settings2,
  Sparkles,
} from "lucide-react";

export type AdminPanel = "overview" | "business" | "marketplace" | "learning" | "cognitive" | "objects";
export type AdminNavSectionId = "cockpit" | "operations" | "governance" | "objects";
export type AdminWorkspaceId =
  | "overview-home"
  | "business-core"
  | "business-third-party"
  | "marketplace-listings"
  | "learning-review"
  | "cognitive-review"
  | "objects-organizations"
  | "objects-accounts"
  | "objects-plans";

export const PANELS: Array<{
  id: AdminPanel;
  label: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  { id: "overview", label: "总览", description: "先看告警、核心指标与待办队列。", icon: Sparkles },
  { id: "business", label: "商业运营", description: "面向经营点、订阅、发票与商品结构。", icon: CircleDollarSign },
  { id: "marketplace", label: "上架与分润", description: "围绕 Listing、安装与分润闭环管理。", icon: BookMarked },
  { id: "learning", label: "学习复核", description: "处理待审记录，收紧判断质量。", icon: ClipboardCheck },
  { id: "cognitive", label: "认知内核", description: "复核低置信、缺证据与异常会话。", icon: BrainCircuit },
  { id: "objects", label: "对象管理", description: "集中处理组织、计划、上架与订阅动作。", icon: Settings2 },
];

export const NAV_SECTIONS: Array<{
  id: AdminNavSectionId;
  title: string;
  description: string;
  panels: AdminPanel[];
}> = [
  {
    id: "cockpit",
    title: "驾驶舱",
    description: "先看全局态势与优先级",
    panels: ["overview"],
  },
  {
    id: "operations",
    title: "经营分析",
    description: "围绕收入、耗用、分润与结构",
    panels: ["business", "marketplace"],
  },
  {
    id: "governance",
    title: "质量治理",
    description: "复核学习质量与认知稳定性",
    panels: ["learning", "cognitive"],
  },
  {
    id: "objects",
    title: "对象操作",
    description: "集中处理组织、计划与账户",
    panels: ["objects"],
  },
];

export const WORKSPACES: Array<{
  id: AdminWorkspaceId;
  navSectionId: AdminNavSectionId;
  panel: AdminPanel;
  label: string;
  description: string;
  sectionId?: string;
}> = [
  {
    id: "overview-home",
    navSectionId: "cockpit",
    panel: "overview",
    label: "总览",
    description: "先看全局告警、关键指标和优先队列。",
  },
  {
    id: "business-core",
    navSectionId: "operations",
    panel: "business",
    label: "商业运营",
    description: "围绕经营点收入、消耗、订阅和发票对象。",
  },
  {
    id: "business-third-party",
    navSectionId: "operations",
    panel: "business",
    label: "第三方耗用",
    description: "查看 Provider / Model 的 Tokens、成本和数据质量。",
    sectionId: "business-third-party-summary",
  },
  {
    id: "marketplace-listings",
    navSectionId: "operations",
    panel: "marketplace",
    label: "上架与分润",
    description: "查看 Listing 健康度、安装、价格和分润结构。",
    sectionId: "marketplace-listings",
  },
  {
    id: "learning-review",
    navSectionId: "governance",
    panel: "learning",
    label: "学习复核",
    description: "按复核队列处理学习记录。",
    sectionId: "learning-review-workbench",
  },
  {
    id: "cognitive-review",
    navSectionId: "governance",
    panel: "cognitive",
    label: "认知内核",
    description: "检查低置信、缺证据和异常会话。",
    sectionId: "cognitive-review-workbench",
  },
  {
    id: "objects-organizations",
    navSectionId: "objects",
    panel: "objects",
    label: "组织",
    description: "查看组织主体、成员规模和账务承载关系。",
    sectionId: "objects-organizations",
  },
  {
    id: "objects-accounts",
    navSectionId: "objects",
    panel: "objects",
    label: "账务账户",
    description: "查看账户归因、绑定组织和账务索引。",
    sectionId: "objects-billing-accounts",
  },
  {
    id: "objects-plans",
    navSectionId: "objects",
    panel: "objects",
    label: "商品/计划",
    description: "查看平台商品结构、权益和价格口径。",
    sectionId: "objects-plan-structure",
  },
];

export function isAdminPanel(value: string): value is AdminPanel {
  return PANELS.some((panel) => panel.id === value);
}

export function getPanelMeta(panelId: AdminPanel) {
  return PANELS.find((panel) => panel.id === panelId) ?? PANELS[0];
}

export function getNavSection(panelId: AdminPanel) {
  return NAV_SECTIONS.find((section) => section.panels.includes(panelId)) ?? NAV_SECTIONS[0];
}

export function getWorkspaceMeta(workspaceId: AdminWorkspaceId) {
  return WORKSPACES.find((workspace) => workspace.id === workspaceId) ?? WORKSPACES[0];
}

export function getWorkspacesBySection(sectionId: AdminNavSectionId) {
  return WORKSPACES.filter((workspace) => workspace.navSectionId === sectionId);
}

export function panelHash(panel: AdminPanel) {
  return `panel-${panel}`;
}

export function learningHash(learningId: string) {
  return `learning-${learningId}`;
}

export function cognitiveHash(sessionId: string) {
  return `cognitive-${sessionId}`;
}

export function usageAnomalyHash(usageRecordId: string) {
  return `business-usage-anomaly-${usageRecordId}`;
}

export function objectHash(kind: "org" | "account" | "plan", id: string) {
  return `objects-${kind}-${id}`;
}

export function parseUsageAnomalyHash(value: string) {
  const match = /^business-usage-anomaly-(.+)$/.exec(value);
  if (!match) return null;
  return { id: match[1] };
}

export function parseObjectHash(value: string) {
  const match = /^objects-(org|account|plan)-(.+)$/.exec(value);
  if (!match) return null;
  return { kind: match[1] as "org" | "account" | "plan", id: match[2] };
}

export function resolveWorkspace(panel: AdminPanel, sectionId?: string): AdminWorkspaceId {
  if (panel === "overview") return "overview-home";
  if (panel === "marketplace") return "marketplace-listings";
  if (panel === "learning") return "learning-review";
  if (panel === "cognitive") return "cognitive-review";
  if (panel === "business") {
    if (
      sectionId === "business-third-party-summary" ||
      sectionId === "business-usage-trend" ||
      sectionId === "business-usage-types" ||
      sectionId === "business-provider-usage" ||
      sectionId === "business-usage-anomalies" ||
      sectionId === "business-model-usage"
    ) {
      return "business-third-party";
    }
    if (sectionId && parseUsageAnomalyHash(sectionId)) {
      return "business-third-party";
    }
    return "business-core";
  }

  if (sectionId === "objects-billing-accounts") return "objects-accounts";
  if (sectionId === "objects-plan-structure") return "objects-plans";
  if (sectionId === "objects-organizations") return "objects-organizations";

  const objectTarget = sectionId ? parseObjectHash(sectionId) : null;
  if (objectTarget?.kind === "account") return "objects-accounts";
  if (objectTarget?.kind === "plan") return "objects-plans";
  return "objects-organizations";
}

export function parseAdminHash(hash: string): { panel: AdminPanel; sectionId?: string } | null {
  const value = hash.replace(/^#/, "").trim();
  if (!value) return null;

  if (value.startsWith("panel-")) {
    const panel = value.slice("panel-".length);
    return isAdminPanel(panel) ? { panel } : null;
  }

  if (value.startsWith("business-")) {
    return { panel: "business", sectionId: value };
  }

  if (value.startsWith("marketplace-")) {
    return { panel: "marketplace", sectionId: value };
  }

  if (value === "learning-review-workbench") {
    return { panel: "learning", sectionId: value };
  }

  if (value.startsWith("learning-")) {
    return { panel: "learning", sectionId: value.slice("learning-".length) };
  }

  if (value === "cognitive-review-workbench") {
    return { panel: "cognitive", sectionId: value };
  }

  if (value.startsWith("cognitive-")) {
    return { panel: "cognitive", sectionId: value.slice("cognitive-".length) };
  }

  if (value.startsWith("objects-")) {
    return { panel: "objects", sectionId: value };
  }

  return null;
}
