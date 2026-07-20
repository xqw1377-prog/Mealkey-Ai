/**
 * 会议接受 → 今日三动作：保证是可执行标题，不被「方案摘要」压成一句。
 */

export type MeetingActionStatus = "planned" | "done" | "skipped";

export type TodayMeetingAction = {
  actionId: string;
  title: string;
  owner?: string;
  status: MeetingActionStatus;
  dueInDays: number;
};

export type SelectableOption = {
  id?: string;
  label: string;
  summary: string;
  tradeoff?: string;
};

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function stripOptionLabel(label: string) {
  return label.replace(/^方案[A-C]\s*·\s*/i, "").trim() || label.trim();
}

/** 选方案时生成/保留多条 nextActions，禁止只用 summary 顶三条 */
export function resolveNextActionsForOption(
  opt: SelectableOption,
  prior?: {
    nextActions?: string[];
    validationPlan?: string;
  },
): string[] {
  const priorActions = (prior?.nextActions || [])
    .map((a) => a.replace(/\s+/g, " ").trim())
    .filter((a) => {
      if (!a) return false;
      // 丢掉被压扁成「整条决策摘要」的伪动作
      if (a === opt.summary) return false;
      if (opt.summary && (a.includes(opt.summary) || opt.summary.includes(a))) {
        return a.length > opt.summary.length + 4;
      }
      return true;
    });

  if (priorActions.length >= 2) {
    return priorActions.slice(0, 4);
  }

  const focus = stripOptionLabel(opt.label);
  return [
    `本周落地「${focus}」的第一步并指定负责人`,
    opt.tradeoff ? `盯住取舍风险：${opt.tradeoff}` : "设截止日并店内抽检一次",
    prior?.validationPlan?.trim() || "本周五对照验证指标复盘",
  ].map((a) => clip(a, 80));
}

/** 会议接受后写入今日「本周三动作」——恰好 3 条可执行标题 */
export function buildTodayActionsFromMeetingConfirm(input: {
  nextActions?: string[];
  action?: string;
  validationPlan?: string;
  /** 若传入，用于剔除「整段判断」冒充动作 */
  judgement?: string;
}): TodayMeetingAction[] {
  const fillers = [
    "把本周唯一动作拆给负责人并设截止日",
    "店内抽检执行并记录偏差",
    "本周五复盘验证指标",
  ];
  const judgement = (input.judgement || "").replace(/\s+/g, " ").trim();

  const raw = [
    ...(input.nextActions || []),
    input.action,
    input.validationPlan,
    ...fillers,
  ]
    .map((s) => (s || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((t) => {
      if (!judgement) return true;
      if (t === judgement) return false;
      // 过长且与判断高度重合 → 不像动作
      if (t.length > 40 && (judgement.includes(t) || t.includes(judgement))) {
        return false;
      }
      return true;
    })
    .map((t) => clip(t, 80));

  const uniq: string[] = [];
  for (const title of raw) {
    if (uniq.some((u) => u === title || u.includes(title) || title.includes(u))) {
      continue;
    }
    uniq.push(title);
    if (uniq.length >= 3) break;
  }
  while (uniq.length < 3) {
    const f = fillers[uniq.length] || `本周动作 ${uniq.length + 1}`;
    if (!uniq.includes(f)) uniq.push(f);
    else break;
  }

  return uniq.slice(0, 3).map((title, i) => ({
    actionId: `act_meeting_${i + 1}`,
    title,
    owner: i === 0 ? "老板" : "店长",
    status: "planned" as const,
    dueInDays: i === 2 ? 5 : 3,
  }));
}

export function toggleTodayActionStatus(
  status: string | undefined,
): MeetingActionStatus {
  return status === "done" ? "planned" : "done";
}
