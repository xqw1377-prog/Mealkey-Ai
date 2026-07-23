/** 粘贴 CSV/TSV 解析（无 xlsx，小程序独立可用） */

function parseDelimitedText(text) {
  const normalized = String(text || "")
    .replace(/^\uFEFF/, "")
    .trim();
  if (!normalized) return [];
  const lines = normalized.split(/\r?\n/).filter((line) => line.trim());
  return lines.map((line) => {
    if (line.indexOf("\t") >= 0) {
      return line.split("\t").map((cell) => cell.trim());
    }
    const cells = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  });
}

function normalizeHeader(raw) {
  const h = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const aliases = {
    日期: "date",
    营业日: "date",
    date: "date",
    餐段: "meal_period",
    时段: "meal_period",
    市别: "meal_period",
    mealperiod: "meal_period",
    meal_period: "meal_period",
    区域: "zone",
    厅区: "zone",
    zone: "zone",
    来客数: "guests",
    客流: "guests",
    人数: "guests",
    guests: "guests",
    人均消费: "avg_ticket",
    人均: "avg_ticket",
    客单价: "avg_ticket",
    avg_ticket: "avg_ticket",
    营收: "revenue",
    营业收入: "revenue",
    revenue: "revenue",
    销售额: "amount",
    amount: "amount",
    成本: "cost",
    cost: "cost",
    费用: "expense",
    expense: "expense",
    利润: "profit",
    profit: "profit",
    菜名: "name",
    品名: "name",
    name: "name",
    分类: "category",
    category: "category",
    售价: "price",
    价格: "price",
    price: "price",
    销量: "qty",
    数量: "qty",
    qty: "qty",
  };
  return aliases[h] || "";
}

function headerIndexMap(header) {
  const map = {};
  for (let i = 0; i < header.length; i++) {
    const key = normalizeHeader(header[i]);
    if (key) map[key] = i;
  }
  return map;
}

function toNumber(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number" && isFinite(raw)) return raw;
  const cleaned = String(raw).replace(/[,，\s￥¥元]/g, "");
  const n = Number(cleaned);
  return isFinite(n) ? n : null;
}

function normalizeDate(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (m) {
    return (
      m[1] +
      "-" +
      String(Number(m[2])).padStart(2, "0") +
      "-" +
      String(Number(m[3])).padStart(2, "0")
    );
  }
  return null;
}

function normalizeMealPeriod(raw) {
  const s = String(raw || "").trim();
  if (!s) return "未标注";
  if (/午|lunch/i.test(s)) return "午市";
  if (/晚|dinner/i.test(s)) return "晚市";
  if (/夜|snack/i.test(s)) return "夜宵";
  if (/早|breakfast/i.test(s)) return "早市";
  return s;
}

function parseDailyText(text) {
  const matrix = parseDelimitedText(text);
  if (matrix.length < 2) throw new Error("日明细至少需要表头 + 一行数据");
  const idx = headerIndexMap(matrix[0] || []);
  if (idx.date === undefined) throw new Error("日明细必须有「日期」列");
  if (idx.meal_period === undefined) throw new Error("日明细必须有「餐段」列");
  if (idx.guests === undefined) throw new Error("日明细必须有「来客数」列");
  if (idx.revenue === undefined && idx.avg_ticket === undefined) {
    throw new Error("日明细至少要有「营收」或「人均」");
  }

  const rows = [];
  const warnings = [];
  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] || [];
    if (line.every((c) => !String(c || "").trim())) continue;
    const date = normalizeDate(line[idx.date]);
    const mealPeriod = normalizeMealPeriod(line[idx.meal_period]);
    const guests = toNumber(line[idx.guests]);
    let revenue = idx.revenue !== undefined ? toNumber(line[idx.revenue]) : null;
    let avgTicket =
      idx.avg_ticket !== undefined ? toNumber(line[idx.avg_ticket]) : null;
    if (!date || guests === null) {
      warnings.push("第 " + (i + 1) + " 行跳过");
      continue;
    }
    if (revenue === null && avgTicket !== null) revenue = guests * avgTicket;
    if (avgTicket === null && revenue !== null && guests > 0) {
      avgTicket = Math.round(revenue / guests);
    }
    rows.push({
      date: date,
      mealPeriod: mealPeriod,
      zone: idx.zone !== undefined ? String(line[idx.zone] || "未分区") : "未分区",
      guests: guests,
      avgTicket: avgTicket || 0,
      revenue: revenue || 0,
      cost: idx.cost !== undefined ? toNumber(line[idx.cost]) || undefined : undefined,
      expense:
        idx.expense !== undefined ? toNumber(line[idx.expense]) || undefined : undefined,
      profit:
        idx.profit !== undefined ? toNumber(line[idx.profit]) || undefined : undefined,
    });
  }
  return { rows: rows, warnings: warnings };
}

function parseDishText(text) {
  const matrix = parseDelimitedText(text);
  if (matrix.length < 2) throw new Error("菜销至少需要表头 + 一行数据");
  const idx = headerIndexMap(matrix[0] || []);
  if (idx.name === undefined) throw new Error("菜销必须有「菜名」列");
  if (idx.qty === undefined) throw new Error("菜销必须有「销量」列");
  if (idx.amount === undefined && idx.revenue === undefined) {
    throw new Error("菜销必须有「销售额」列");
  }

  const rows = [];
  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] || [];
    if (line.every((c) => !String(c || "").trim())) continue;
    const dishName = String(line[idx.name] || "").trim();
    const qty = toNumber(line[idx.qty]);
    const amount =
      idx.amount !== undefined
        ? toNumber(line[idx.amount])
        : toNumber(line[idx.revenue]);
    if (!dishName || qty === null || amount === null) continue;
    rows.push({
      date: idx.date !== undefined ? normalizeDate(line[idx.date]) || undefined : undefined,
      mealPeriod:
        idx.meal_period !== undefined
          ? normalizeMealPeriod(line[idx.meal_period])
          : undefined,
      dishName: dishName,
      category:
        idx.category !== undefined
          ? String(line[idx.category] || "未分类")
          : "未分类",
      qty: qty,
      amount: amount,
      cost: idx.cost !== undefined ? toNumber(line[idx.cost]) || undefined : undefined,
    });
  }
  return { rows: rows, warnings: [] };
}

function parseMenuText(text) {
  const matrix = parseDelimitedText(text);
  if (matrix.length < 2) throw new Error("菜单至少需要表头 + 一行数据");
  const idx = headerIndexMap(matrix[0] || []);
  if (idx.name === undefined) throw new Error("菜单必须有「菜名」列");
  if (idx.price === undefined) throw new Error("菜单必须有「售价」列");

  const rows = [];
  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] || [];
    const name = String(line[idx.name] || "").trim();
    const price = toNumber(line[idx.price]);
    if (!name || price === null) continue;
    rows.push({
      name: name,
      price: price,
      cost: idx.cost !== undefined ? toNumber(line[idx.cost]) || undefined : undefined,
      category:
        idx.category !== undefined
          ? String(line[idx.category] || "")
          : undefined,
      kind: "dish",
    });
  }
  return { rows: rows, warnings: [] };
}

/**
 * 导入质检单：与引擎硬门槛对齐（日≥7、菜销≥8、菜单≥1 为深检完整档）
 */
function assessImportBundle(bundle) {
  const daily = (bundle && bundle.daily) || [];
  const sales = (bundle && bundle.sales) || [];
  const menu = (bundle && bundle.menu) || [];
  const evidence = (bundle && bundle.evidence) || [];
  const daySet = {};
  for (let i = 0; i < daily.length; i++) {
    if (daily[i].date) daySet[daily[i].date] = true;
  }
  const days = Object.keys(daySet).length;
  const hard = [];
  const soft = [];
  const okHints = [];

  if (daily.length < 1) {
    hard.push("未导入日×餐段明细 → 财务官将拒签");
  } else if (days < 7) {
    hard.push(
      "营业日仅 " + days + " 天（阈值 ≥7）→ 财务官硬门槛不足，将拒签或严重降权",
    );
  } else {
    okHints.push("日明细 " + daily.length + " 行 / " + days + " 个营业日 ✓");
  }

  if (sales.length < 1) {
    soft.push("未导入菜品销售 → 产品官无法做 ABC / 毛利矩阵");
  } else if (sales.length < 8) {
    soft.push("菜销仅 " + sales.length + " 行（建议 ≥8）→ 产品官可能拒签");
  } else {
    okHints.push("菜销 " + sales.length + " 行 ✓");
  }

  if (menu.length < 1) {
    soft.push("未导入菜单 → 无法 JOIN 成本做毛利四象限");
  } else {
    okHints.push("菜单 " + menu.length + " 项 ✓");
  }

  if (evidence.length < 1) {
    soft.push("未粘贴评论 → 体验官仅能弱信号或依赖空证据");
  } else {
    okHints.push("评论证据 " + evidence.length + " 条（已规则打标）✓");
  }

  const canDeepFinance = days >= 7 && daily.length >= 7;
  const canFullCouncil = canDeepFinance && sales.length >= 8 && menu.length >= 1;

  return {
    days: days,
    dailyRows: daily.length,
    salesRows: sales.length,
    menuRows: menu.length,
    evidenceRows: evidence.length,
    hard: hard,
    soft: soft,
    okHints: okHints,
    canDeepFinance: canDeepFinance,
    canFullCouncil: canFullCouncil,
    summary: canFullCouncil
      ? "质检通过：可出具完整四官会审"
      : hard.length
        ? "硬门槛未齐：" + hard[0]
        : "可出部分会审；建议补齐：" + (soft[0] || "强建议项"),
  };
}

const SAMPLE_DAILY =
  "日期,餐段,来客数,营收\n" +
  "2026-04-01,午市,28,2128\n" +
  "2026-04-01,晚市,40,3520\n" +
  "2026-04-01,夜宵,16,1088\n" +
  "2026-04-02,午市,30,2280\n" +
  "2026-04-02,晚市,42,3696\n" +
  "2026-04-02,夜宵,15,1020\n" +
  "2026-04-03,午市,26,1976\n" +
  "2026-04-03,晚市,38,3344\n" +
  "2026-04-03,夜宵,14,952\n" +
  "2026-04-04,午市,32,2432\n" +
  "2026-04-04,晚市,45,3960\n" +
  "2026-04-04,夜宵,18,1224\n" +
  "2026-04-05,午市,29,2204\n" +
  "2026-04-05,晚市,41,3608\n" +
  "2026-04-05,夜宵,17,1156\n" +
  "2026-04-06,午市,27,2052\n" +
  "2026-04-06,晚市,39,3432\n" +
  "2026-04-06,夜宵,15,1020\n" +
  "2026-04-07,午市,31,2356\n" +
  "2026-04-07,晚市,44,3872\n" +
  "2026-04-07,夜宵,16,1088";

const SAMPLE_DISH =
  "日期,餐段,菜名,销量,销售额\n" +
  "2026-04-01,晚市,招牌红烧肉,18,1224\n" +
  "2026-04-01,晚市,剁椒鱼头,10,980\n" +
  "2026-04-01,晚市,小炒黄牛肉,12,696\n" +
  "2026-04-01,晚市,低毛利引流烤翅,22,858\n" +
  "2026-04-01,午市,农家小炒肉,8,384\n" +
  "2026-04-01,午市,酸辣土豆丝,10,220\n" +
  "2026-04-01,晚市,长沙米酒,14,252\n" +
  "2026-04-01,晚市,自制酸梅汤,9,144\n" +
  "2026-04-02,晚市,招牌红烧肉,16,1088\n" +
  "2026-04-02,晚市,剁椒鱼头,9,882";

const SAMPLE_MENU =
  "菜名,售价,成本,分类\n" +
  "招牌红烧肉,68,42,热菜\n" +
  "剁椒鱼头,98,55,热菜\n" +
  "小炒黄牛肉,58,28,热菜\n" +
  "农家小炒肉,48,18,热菜\n" +
  "酸辣土豆丝,22,6,素菜\n" +
  "低毛利引流烤翅,39,28,热菜\n" +
  "长沙米酒,18,4,饮品\n" +
  "自制酸梅汤,16,3,饮品";

module.exports = {
  parseDailyText: parseDailyText,
  parseDishText: parseDishText,
  parseMenuText: parseMenuText,
  assessImportBundle: assessImportBundle,
  SAMPLE_DAILY: SAMPLE_DAILY,
  SAMPLE_DISH: SAMPLE_DISH,
  SAMPLE_MENU: SAMPLE_MENU,
};
