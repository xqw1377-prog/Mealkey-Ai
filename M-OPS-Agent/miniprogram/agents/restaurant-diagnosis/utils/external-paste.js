/**
 * 外采结构化粘贴 — 禁止假爬虫；仅解析用户粘贴的公开摘要/评论。
 *
 * 推荐格式：
 * 平台: 大众点评
 * 星级: 4.2
 * 评论数: 128
 * ---
 * 周末等位太久
 * 红烧肉很下饭
 */
const diagnose = require("./diagnose.js");

function parseExternalBlock(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    return {
      meta: {},
      evidence: [],
      warnings: ["未粘贴外采内容"],
    };
  }

  const parts = raw.split(/\n---\n|\n—{2,}\n/);
  const head = (parts[0] || "").split(/\r?\n/);
  const body =
    parts.length > 1
      ? parts.slice(1).join("\n")
      : head
          .filter(function (line) {
            return !/^(平台|来源|星级|评分|评论数|门店|地址)\s*[:：]/.test(line.trim());
          })
          .join("\n");

  const meta = { platform: "manual", rating: null, reviewCount: null, storeName: "" };
  for (let i = 0; i < head.length; i++) {
    const line = head[i].trim();
    let m = line.match(/^(平台|来源)\s*[:：]\s*(.+)$/);
    if (m) {
      meta.platform = normalizePlatform(m[2]);
      continue;
    }
    m = line.match(/^(星级|评分)\s*[:：]\s*([\d.]+)/);
    if (m) {
      meta.rating = Number(m[2]);
      continue;
    }
    m = line.match(/^(评论数|条数)\s*[:：]\s*(\d+)/);
    if (m) {
      meta.reviewCount = Number(m[2]);
      continue;
    }
    m = line.match(/^(门店|店名)\s*[:：]\s*(.+)$/);
    if (m) {
      meta.storeName = m[2].trim();
    }
  }

  const evidence = diagnose.tagComments(body).map(function (e) {
    return Object.assign({}, e, { source: meta.platform || e.source || "manual" });
  });

  const warnings = [];
  if (!evidence.length) warnings.push("未识别到评论行（每行一条，或用 --- 分隔元数据与评论）");
  if (meta.rating == null) warnings.push("未填星级（可选）");
  warnings.push("外采须为你合法取得的公开摘要；本程序不做网页抓取");

  return { meta: meta, evidence: evidence, warnings: warnings };
}

function normalizePlatform(raw) {
  const s = String(raw || "");
  if (/点评|dianping/i.test(s)) return "dianping";
  if (/美团|meituan/i.test(s)) return "meituan";
  if (/小红书|xhs|red/i.test(s)) return "xiaohongshu";
  if (/抖音|douyin|tiktok/i.test(s)) return "douyin";
  if (/地图|高德|百度/i.test(s)) return "map";
  return "manual";
}

const EXTERNAL_SAMPLE =
  "平台: 大众点评\n" +
  "星级: 4.1\n" +
  "评论数: 86\n" +
  "门店: 湘味小馆\n" +
  "---\n" +
  "周末等位太久，上菜慢\n" +
  "红烧肉很下饭会回购\n" +
  "高峰排队劝退\n" +
  "有点贵不太值\n" +
  "环境有点吵但菜可以";

const EXTERNAL_HELP =
  "合法粘贴公开评价摘要即可。格式：平台/星级/评论数 + 一行 --- + 每行一条评论。不做网页抓取。";

module.exports = {
  parseExternalBlock: parseExternalBlock,
  EXTERNAL_SAMPLE: EXTERNAL_SAMPLE,
  EXTERNAL_HELP: EXTERNAL_HELP,
};
