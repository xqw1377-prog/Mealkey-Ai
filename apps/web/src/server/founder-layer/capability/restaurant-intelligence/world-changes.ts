/**
 * RIP 差分 → 「今天生意发生了什么」世界变化条（E1/E2）
 * 纯投影，不 invent 假数据；每条可进决策会议室。
 */

import { decisionReadyPath } from "@/lib/decision-entry";
import type { RipDiffV1 } from "./rip-diff";
import type { RestaurantIntelligenceSnapshotV1 } from "@/server/founder-layer/contracts/restaurant-intelligence-profile";
import { isUsableBusinessEvidenceSnippet } from "./evidence-quality";

export type WorldChangeKindV1 =
  | "review"
  | "competition"
  | "customer"
  | "alert";

export type WorldChangeV1 = {
  id: string;
  kind: WorldChangeKindV1;
  title: string;
  detail: string;
  /** E2：预填决策议题 */
  decisionTopic?: string;
  /** E2：决策室入口 */
  href?: string;
};

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function decisionTopicFromWorldChange(change: {
  kind: WorldChangeKindV1;
  title: string;
  detail: string;
}): string {
  if (change.kind === "customer") {
    const focus = change.title
      .replace(/^顾客侧需关注：/, "")
      .replace(/^顾客正向上升：/, "");
    return clip(`是否优先处理顾客侧「${focus}」？`, 64);
  }
  if (change.kind === "competition") {
    return "周边竞争/商圈有变化，要不要调整本店打法？";
  }
  if (change.kind === "review") {
    return "最新顾客评价有变化，今天要不要立刻行动？";
  }
  return clip(change.title, 64) || "根据今日经营变化，下一步最该拍什么板？";
}

/**
 * 从日更差分生成最多 5 条世界变化；无实质变化 → []
 */
export function buildWorldChangesFromDiff(input: {
  diff: RipDiffV1;
  current: RestaurantIntelligenceSnapshotV1;
  projectId?: string;
}): WorldChangeV1[] {
  const { diff, current } = input;
  const out: WorldChangeV1[] = [];

  if (diff.addedEvidenceIds.length > 0) {
    const marketEvs = current.evidence.filter((e) =>
      diff.addedEvidenceIds.includes(e.id),
    );
    const reviewLike = marketEvs.filter(
      (e) =>
        /点评|小红书|美团|抖音|公开检索|口碑|评价/.test(e.source) ||
        e.signal === "review_signal",
    );
    const competitionLike = marketEvs.filter(
      (e) =>
        /地图|商圈|竞争|竞品/.test(`${e.source}${e.content}`) ||
        e.signal === "market_scan",
    );

    if (reviewLike.length > 0) {
      const usable = reviewLike.filter((e) =>
        isUsableBusinessEvidenceSnippet(e.content || ""),
      );
      const usableCount = usable.length || reviewLike.length;
      const detailRaw = usable[0]?.content;
      out.push({
        id: `wc_review_${diff.toSnapshotId.slice(-6)}`,
        kind: "review",
        title: `公开渠道新增 ${usableCount} 条评价线索`,
        detail: clip(
          detailRaw && isUsableBusinessEvidenceSnippet(detailRaw)
            ? detailRaw
            : "有新的口碑线索进入经营画像，但片段质量不足，请先核对或补采后再判断。",
          120,
        ),
      });
    } else if (diff.addedEvidenceIds.length > 0) {
      out.push({
        id: `wc_ev_${diff.toSnapshotId.slice(-6)}`,
        kind: "review",
        title: `新增 ${diff.addedEvidenceIds.length} 条市场证据`,
        detail: clip(diff.summaryLine, 120),
      });
    }

    if (competitionLike.length > 0) {
      const usableComp = competitionLike.find((e) =>
        isUsableBusinessEvidenceSnippet(e.content || ""),
      );
      out.push({
        id: `wc_comp_${diff.toSnapshotId.slice(-6)}`,
        kind: "competition",
        title: "周边竞争 / 商圈线索有更新",
        detail: clip(
          usableComp?.content ||
            "检测到商圈或竞争相关公开信息（片段待核验）。",
          120,
        ),
      });
    }
  }

  for (const w of diff.newWatchouts.slice(0, 2)) {
    out.push({
      id: `wc_watch_${w.slice(0, 12)}`,
      kind: "customer",
      title: `顾客侧需关注：${w}`,
      detail: "差评或风险关键词上升，建议评估是否升格为今日决策。",
    });
  }

  for (const p of diff.newPositiveKeywords.slice(0, 1)) {
    if (diff.newWatchouts.length > 0) break;
    out.push({
      id: `wc_pos_${p.slice(0, 12)}`,
      kind: "customer",
      title: `顾客正向上升：${p}`,
      detail: "可评估是否加大相关运营投入，而非立刻扩店。",
    });
  }

  for (const line of diff.alertLines.slice(0, 1)) {
    if (out.length >= 4) break;
    out.push({
      id: `wc_alert_${diff.toSnapshotId.slice(-6)}`,
      kind: "alert",
      title: "系统提醒有更新",
      detail: clip(line, 120),
    });
  }

  const seen = new Set<string>();
  const deduped = out
    .filter((c) => {
      if (seen.has(c.title)) return false;
      seen.add(c.title);
      return true;
    })
    .slice(0, 5);

  const projectId = input.projectId;
  if (!projectId) return deduped;

  return deduped.map((c) => {
    const decisionTopic = decisionTopicFromWorldChange(c);
    return {
      ...c,
      decisionTopic,
      href: decisionReadyPath(projectId, decisionTopic),
    };
  });
}

export function worldChangesSummaryLine(changes: WorldChangeV1[]): string {
  if (!changes.length) {
    return "今天外部世界暂无新增变化；继续盯紧今日焦点即可。";
  }
  return `你的经营世界今天发生了 ${changes.length} 个变化。`;
}

/** 主 CTA：有变化时默认进第一条的决策室 */
export function primaryWorldChangeHref(
  projectId: string,
  changes: WorldChangeV1[],
  fallbackTopic?: string,
): string {
  const first = changes[0];
  if (first?.href) return first.href;
  if (first?.decisionTopic) {
    return decisionReadyPath(projectId, first.decisionTopic);
  }
  if (fallbackTopic?.trim()) {
    return decisionReadyPath(projectId, fallbackTopic.trim());
  }
  return decisionReadyPath(
    projectId,
    "根据今日经营变化，下一步最该拍什么板？",
  );
}
