/**
 * 一手店访证据计划 — 公开检索不够时，明确「还差什么必须去店里看」
 * 支持回填：勾选/填现场观察 → 更新竞对三联
 */
import type { CompetitorIntel } from "./collector";
import type { MarketResearchPack } from "../journey-types";
import {
  buildStoreVisitInsightPack,
} from "./visit-insight";

/** 店访照片/录音附件（引用项目 Asset，不存二进制） */
export type StoreVisitAttachment = {
  assetId: string;
  kind: "image" | "audio";
  publicUrl: string;
  fileName: string;
  title?: string;
  /** 录音转写文本（上传时由 Asset 转写管线写入） */
  transcript?: string;
};

export type StoreVisitTask = {
  rivalName: string;
  mentalHypothesis: string;
  checklist: string[];
  whyMatters: string;
  status: "pending" | "filled";
  filledNote?: string;
  /** 回填后钉死的心智词 */
  observedMentalWord?: string;
  /** 回填证据句 */
  observedEvidence?: string;
  observedThreat?: string;
  filledAt?: string;
  /** 店访照片/录音（Asset 引用） */
  attachments?: StoreVisitAttachment[];
};

export type StoreVisitPlan = {
  title: string;
  honestyNote: string;
  tasks: StoreVisitTask[];
  markdown: string;
};

/** 单店回填输入 */
export type StoreVisitFillInput = {
  rivalName: string;
  /** 现场钉死的心智词（客人/门头可复述） */
  observedMentalWord: string;
  /** 店访证据句（门头/菜单/话术原话） */
  evidenceSentence: string;
  /** 相对本稿空位的威胁（可选） */
  threatToWhitespace?: string;
  /** 已核对的清单项（可选） */
  checkedItems?: string[];
  note?: string;
  /** 已上传的照片/录音 Asset 引用（最多 6） */
  attachments?: StoreVisitAttachment[];
};

const MAX_STORE_VISIT_ATTACHMENTS = 6;

export function normalizeStoreVisitAttachments(
  raw?: StoreVisitAttachment[],
): StoreVisitAttachment[] {
  if (!raw?.length) return [];
  const seen = new Set<string>();
  const out: StoreVisitAttachment[] = [];
  for (const a of raw) {
    if (!a?.assetId || seen.has(a.assetId)) continue;
    if (a.kind !== "image" && a.kind !== "audio") continue;
    seen.add(a.assetId);
    out.push({
      assetId: a.assetId,
      kind: a.kind,
      publicUrl: a.publicUrl || `/api/assets/${a.assetId}/file`,
      fileName: a.fileName || a.assetId,
      title: a.title,
      transcript: a.transcript?.trim() || undefined,
    });
    if (out.length >= MAX_STORE_VISIT_ATTACHMENTS) break;
  }
  return out;
}

const DEFAULT_CHECKS = [
  "门头/橱窗第一眼词是什么（客人 3 秒能读到的）",
  "菜单主推前 3 道与对外口号是否一致",
  "店员开口第一句在卖什么（场合 / 价格 / 招牌）",
  "客单价体感带与定位是否打架",
  "高峰是否排队、客人原话里复述的差异点",
];

function planToMarkdown(
  title: string,
  honestyNote: string,
  ws: string,
  tasks: StoreVisitTask[],
): string {
  return [
    `## 店访一手证据计划`,
    ``,
    `> ${honestyNote}`,
    ``,
    `本稿空位假设：「${ws}」——未店访前只能当假设；已回填项可升级为现场证据。`,
    ``,
    ...tasks.flatMap((t, i) => [
      `### ${i + 1}. ${t.rivalName}`,
      ``,
      `- **心智假说**：${t.mentalHypothesis}`,
      t.observedMentalWord
        ? `- **现场心智词**：${t.observedMentalWord}`
        : "",
      t.observedEvidence ? `- **店访证据**：${t.observedEvidence}` : "",
      t.observedThreat ? `- **空位威胁（店访）**：${t.observedThreat}` : "",
      `- **为何必须去**：${t.whyMatters}`,
      `- **状态**：${t.status === "pending" ? "待店访" : "已补录"}`,
      `- **清单**：`,
      ...t.checklist.map((c) => {
        const done =
          t.status === "filled" ||
          (t.filledNote || "").includes(c.slice(0, 8));
        return `  - [${done ? "x" : " "}] ${c}`;
      }),
      t.filledNote ? `- **回填备注**：${t.filledNote}` : "",
      t.attachments?.length
        ? `- **附件**：${t.attachments
            .map((a) => {
              const label = `${a.kind === "image" ? "照片" : "录音"}「${a.fileName}」`;
              return a.transcript
                ? `${label}（转写：${a.transcript.slice(0, 80)}${a.transcript.length > 80 ? "…" : ""}）`
                : label;
            })
            .join("；")}`
        : "",
      ``,
    ]),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function buildStoreVisitPlan(input: {
  city?: string;
  whitespace?: string;
  competitors: Array<{
    name: string;
    mentalPosition?: string;
    evidenceSentence?: string;
    threatToWhitespace?: string;
    dataQuality?: string;
  }>;
}): StoreVisitPlan {
  const city = input.city || "目标城市";
  const ws = input.whitespace || "目标空位";
  const rivals = input.competitors.slice(0, 5);

  const tasks: StoreVisitTask[] = rivals.map((c) => {
    const mental = c.mentalPosition || `${c.name}默认联想（待钉死）`;
    const thin =
      c.dataQuality === "inferred" ||
      !c.evidenceSentence ||
      /暂未|待|不足/.test(c.evidenceSentence || "");
    return {
      rivalName: c.name,
      mentalHypothesis: mental,
      checklist: [
        ...DEFAULT_CHECKS,
        thin
          ? `公开证据偏薄：必须现场确认「${mental}」是否被客人复述`
          : `核对公开证据句是否仍成立：${(c.evidenceSentence || "").slice(0, 40)}`,
        c.threatToWhitespace
          ? `评估威胁是否属实：${c.threatToWhitespace.slice(0, 48)}`
          : `评估其是否正在挤占「${ws}」`,
      ],
      whyMatters: thin
        ? `公开检索无法钉死${c.name}心智位；不店访则空位「${ws}」判断不可信。`
        : `用店访验证${c.name}是否真占「${mental}」，避免空位选错。`,
      status: "pending" as const,
    };
  });

  if (!tasks.length) {
    tasks.push({
      rivalName: "周边同质馆（待点名）",
      mentalHypothesis: "宽菜单 / 价格",
      checklist: DEFAULT_CHECKS,
      whyMatters: `无明确竞对名单时，先店访 2 家同圈层门店，再回收空位「${ws}」。`,
      status: "pending",
    });
  }

  const honestyNote =
    "诚实标注：以下为「待补一手证据」，不是已完成的店访结论。公开检索 ≠ 店访。回填后可升级为现场证据。";

  const title = `${city} · 一手店访证据计划`;
  return {
    title,
    honestyNote,
    tasks,
    markdown: planToMarkdown(title, honestyNote, ws, tasks),
  };
}

export function buildStoreVisitPlanFromCompetitors(
  competitors: CompetitorIntel[],
  meta: { city?: string; whitespace?: string },
): StoreVisitPlan {
  return buildStoreVisitPlan({
    city: meta.city,
    whitespace: meta.whitespace,
    competitors,
  });
}

/**
 * 回填单店店访 → 更新 storeVisitPlan + competitorBriefs 三联
 * 返回新 pack；调用方负责清下游顾问/会议（证据变硬需重跑）
 */
export function applyStoreVisitFill(
  pack: MarketResearchPack,
  fill: StoreVisitFillInput,
): MarketResearchPack {
  const mental = (fill.observedMentalWord || "").trim();
  const evidenceRaw = (fill.evidenceSentence || "").trim();
  if (!fill.rivalName?.trim()) {
    throw new Error("请指定店访竞对名称");
  }
  if (mental.length < 2) {
    throw new Error("请填写现场钉死的心智词（至少 2 字）");
  }

  const nowIso = new Date().toISOString();
  const checkedNote = (fill.checkedItems || []).length
    ? `已核：${fill.checkedItems!.slice(0, 5).join("；")}`
    : "";
  const attachments = normalizeStoreVisitAttachments(fill.attachments);
  const transcriptBits = attachments
    .map((a) => a.transcript?.trim())
    .filter((t): t is string => Boolean(t && t.length >= 2 && t !== "[无语音内容]"));
  const attachNote = attachments.length
    ? `附件${attachments.length}份（${attachments.map((a) => a.kind).join("+")}${
        transcriptBits.length ? `·转写${transcriptBits.length}` : ""
      }）`
    : "";
  const note = [fill.note?.trim(), checkedNote, attachNote]
    .filter(Boolean)
    .join(" · ");

  // 若用户未写够证据句但有录音转写，用转写补证据（仍要求最终 ≥6 字）
  let evidence = evidenceRaw;
  if (evidence.length < 6 && transcriptBits.length) {
    evidence = transcriptBits.join("；").slice(0, 280);
  }
  if (evidence.length < 6) {
    throw new Error("请填写店访证据句（门头/菜单/话术原话），或上传可转写的录音");
  }

  const threat =
    (fill.threatToWhitespace || "").trim() ||
    `${fill.rivalName}现场心智「${mental}」可能挤压「${pack.whitespace}」；差异必须可一句话复述。`;

  const prevPlan = pack.storeVisitPlan;
  const prevTasks = prevPlan?.tasks || [];
  let found = false;
  const tasks: StoreVisitTask[] = prevTasks.map((t) => {
    if (t.rivalName !== fill.rivalName) return t;
    found = true;
    return {
      ...t,
      status: "filled",
      observedMentalWord: mental,
      observedEvidence: evidence,
      observedThreat: threat,
      filledNote: note || `店访回填于 ${nowIso.slice(0, 10)}`,
      filledAt: nowIso,
      attachments: attachments.length ? attachments : t.attachments,
    };
  });

  if (!found) {
    tasks.push({
      rivalName: fill.rivalName,
      mentalHypothesis: mental,
      checklist: DEFAULT_CHECKS,
      whyMatters: "现场补录竞对",
      status: "filled",
      observedMentalWord: mental,
      observedEvidence: evidence,
      observedThreat: threat,
      filledNote: note || `店访回填于 ${nowIso.slice(0, 10)}`,
      filledAt: nowIso,
      attachments: attachments.length ? attachments : undefined,
    });
  }

  const city = pack.scope?.city || "目标城市";
  const title = prevPlan?.title || `${city} · 一手店访证据计划`;
  const honestyNote =
    prevPlan?.honestyNote ||
    "诚实标注：已回填项为现场证据；未回填项仍为待办。";

  const storeVisitPlan = {
    title,
    honestyNote,
    tasks,
    markdown: planToMarkdown(title, honestyNote, pack.whitespace, tasks),
  };

  const briefs = [...(pack.competitorBriefs || [])];
  const bi = briefs.findIndex(
    (b) => b.name === fill.rivalName || fill.rivalName.includes(b.name),
  );
  const updatedBrief = {
    name: bi >= 0 ? briefs[bi]!.name : fill.rivalName,
    mentalPosition: mental,
    evidenceSentence: `【店访】${evidence}`,
    threatToWhitespace: threat,
    summary:
      bi >= 0
        ? `${briefs[bi]!.summary}｜店访升级：${mental}`
        : `店访补录：${mental}；${evidence}`,
    dataQuality: "store_visit",
  };
  if (bi >= 0) briefs[bi] = updatedBrief;
  else briefs.push(updatedBrief);

  const filledCount = tasks.filter((t) => t.status === "filled").length;
  const evidenceNotes = [
    attachments.length
      ? `店访回填「${fill.rivalName}」：心智词=${mental}；附件${attachments.length}${
          transcriptBits.length ? `；转写${transcriptBits.length}段` : ""
        }`
      : `店访回填「${fill.rivalName}」：心智词=${mental}`,
    ...transcriptBits.map(
      (t, i) => `店访录音转写「${fill.rivalName}」#${i + 1}：${t.slice(0, 120)}`,
    ),
    ...(pack.evidenceNotes || []).filter(
      (n) =>
        !n.includes(`店访回填「${fill.rivalName}」`) &&
        !n.includes(`店访录音转写「${fill.rivalName}」`),
    ),
  ].slice(0, 14);

  // 轻量补丁报告附录：若有 reportMarkdown，替换/追加店访段
  let reportMarkdown = pack.reportMarkdown;
  if (reportMarkdown) {
    const visitBlock = storeVisitPlan.markdown;
    if (/### 一手店访证据计划|## 店访一手证据计划/.test(reportMarkdown)) {
      reportMarkdown = reportMarkdown.replace(
        /### 一手店访证据计划[\s\S]*?(?=---\n|\*本报告|$)/,
        `${visitBlock}\n\n`,
      );
      if (
        !reportMarkdown.includes("店访一手证据计划") &&
        !reportMarkdown.includes(visitBlock.slice(0, 20))
      ) {
        reportMarkdown = `${reportMarkdown.trim()}\n\n${visitBlock}\n`;
      }
    } else {
      reportMarkdown = `${reportMarkdown.trim()}\n\n${visitBlock}\n`;
    }
  }

  let nextPack: MarketResearchPack = {
    ...pack,
    competitorBriefs: briefs,
    storeVisitPlan,
    evidenceNotes,
    reportMarkdown,
    headline:
      filledCount > 0
        ? pack.headline.replace(/（含店访升级）$/, "") + "（含店访升级）"
        : pack.headline,
  };

  // 假说 vs 现场 → 空位修正建议
  if (filledCount > 0) {
    const insight = buildStoreVisitInsightPack({ pack: nextPack });
    nextPack = { ...nextPack, storeVisitInsight: insight };
    if (nextPack.reportMarkdown) {
      const block = insight.markdown;
      if (/## 假说 vs 现场/.test(nextPack.reportMarkdown)) {
        nextPack.reportMarkdown = nextPack.reportMarkdown.replace(
          /## 假说 vs 现场[\s\S]*?(?=## |---\n|\*本报告|$)/,
          `${block}\n`,
        );
      } else {
        nextPack.reportMarkdown = `${nextPack.reportMarkdown.trim()}\n\n${block}\n`;
      }
    }
  }

  return nextPack;
}

export function countFilledStoreVisits(pack: MarketResearchPack): number {
  return (pack.storeVisitPlan?.tasks || []).filter((t) => t.status === "filled")
    .length;
}

export function hasPendingStoreVisits(pack: MarketResearchPack): boolean {
  const tasks = pack.storeVisitPlan?.tasks || [];
  if (!tasks.length) return false;
  return tasks.some((t) => t.status === "pending");
}
