/**
 * 从已上传资料的 extractedText / CSV 中抽出经营信号（启发式，不装懂）
 */

export type FileSignalV1 = {
  bullets: string[];
  suggestedSlots: Record<string, string | number>;
  evidenceSnippet: string;
};

function parseNumberish(raw: string): number | null {
  const cleaned = raw.replace(/[,，\s]/g, "").replace(/万/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  if (/万/.test(raw)) return n * 10000;
  return n;
}

/** 从表格/文本中抽取可引用发现 */
export function extractFileSignals(text: string, fileLabel?: string): FileSignalV1 {
  const src = (text || "").trim();
  const bullets: string[] = [];
  const suggestedSlots: Record<string, string | number> = {};

  if (!src) {
    return {
      bullets: [
        fileLabel
          ? `已收到「${fileLabel}」，但未能提取可读文本，请补充说明或改传 CSV/xlsx。`
          : "资料为空或无法解析。",
      ],
      suggestedSlots: {},
      evidenceSnippet: "",
    };
  }

  const snippet = src.slice(0, 1200);
  const lines = src.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 营业额行
  for (const line of lines.slice(0, 80)) {
    if (/营业额|销售额|营收|流水/.test(line)) {
      const m = line.match(/(\d+(?:\.\d+)?)\s*万?/);
      if (m?.[1]) {
        const n = parseNumberish(m[0]);
        if (n && n > 1000) {
          suggestedSlots.monthly_revenue = n > 100000 ? `${Math.round(n / 10000)}万` : String(n);
          bullets.push(`资料中出现营业额相关数字：约 ${suggestedSlots.monthly_revenue}（需你确认口径）。`);
          break;
        }
      }
    }
  }

  // 人数
  for (const line of lines.slice(0, 80)) {
    if (/员工|人数|编制|人效|用工/.test(line)) {
      const m = line.match(/(\d{1,3})\s*人/);
      if (m?.[1]) {
        suggestedSlots.staff_count = Number(m[1]);
        bullets.push(`资料提及人员规模约 ${m[1]} 人（需确认是否含兼职折算）。`);
        break;
      }
    }
  }

  // 下降/客流
  if (/午餐|午市/.test(src) && (/下降|下滑|减少|跌/.test(src) || /-\s*\d+%/.test(src))) {
    const pct = src.match(/下降\s*(\d+)\s*%|-\s*(\d+)\s*%/);
    const p = pct?.[1] || pct?.[2];
    bullets.push(
      p
        ? `午餐/午市相关指标疑似下降约 ${p}%（来自表格文本匹配，非审计结论）。`
        : "午餐/午市相关行出现下降表述，建议作为收入侧优先排查。",
    );
    if (!suggestedSlots.main_pain) suggestedSlots.main_pain = "收入";
  }

  if (/招牌|爆品|主推/.test(src) && (/下降|下滑|贡献/.test(src))) {
    bullets.push("招牌/爆品贡献疑似走弱，建议对照点单结构。");
  }

  if (/人效|人均产值|人工成本/.test(src)) {
    bullets.push("资料含人效/人工成本字段，适合做人效对照。");
    if (!suggestedSlots.main_pain) suggestedSlots.main_pain = "人效";
  }

  if (/损耗|报损|毛利/.test(src)) {
    bullets.push("资料含损耗/毛利相关字段，成本侧可查。");
    if (!suggestedSlots.main_pain) suggestedSlots.main_pain = "成本";
  }

  if (bullets.length === 0) {
    bullets.push(
      `已解析「${fileLabel || "经营资料"}」文本 ${Math.min(src.length, 8000)} 字，未命中标准营业额字段；下面基于片段做假设诊断。`,
    );
  }

  return {
    bullets: bullets.slice(0, 6),
    suggestedSlots,
    evidenceSnippet: snippet,
  };
}
