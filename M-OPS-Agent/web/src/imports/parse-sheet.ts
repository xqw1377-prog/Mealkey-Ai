import * as XLSX from "xlsx";

export function parseDelimitedText(text: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  if (!normalized) return [];
  const lines = normalized.split(/\r?\n/).filter((line) => line.trim());
  return lines.map((line) => {
    if (line.includes("\t")) return line.split("\t").map((cell) => cell.trim());
    // simple CSV with quotes
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
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

export async function sheetToMatrix(file: File): Promise<{
  matrix: string[][];
  fileName: string;
}> {
  const fileName = file.name;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    const text = await file.text();
    return { matrix: parseDelimitedText(text), fileName };
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error("Excel 里没有工作表");
    const sheet = wb.Sheets[sheetName]!;
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });
    const matrix = rows.map((row) =>
      (Array.isArray(row) ? row : []).map((cell) => String(cell ?? "").trim()),
    );
    return { matrix, fileName };
  }
  throw new Error("请上传 .xlsx / .xls / .csv 文件");
}

export function headerIndexMap(header: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  header.forEach((raw, index) => {
    const key = normalizeHeader(raw);
    if (key) map[key] = index;
  });
  return map;
}

function normalizeHeader(raw: string): string {
  const h = raw.trim().toLowerCase().replace(/\s+/g, "");
  const aliases: Record<string, string> = {
    月份: "month",
    月: "month",
    month: "month",
    日期: "date",
    营业日: "date",
    date: "date",
    day: "date",
    餐段: "meal_period",
    时段: "meal_period",
    市别: "meal_period",
    mealperiod: "meal_period",
    meal_period: "meal_period",
    period: "meal_period",
    区域: "zone",
    厅区: "zone",
    分区: "zone",
    桌台区域: "zone",
    zone: "zone",
    area: "zone",
    来客数: "guests",
    客流: "guests",
    人数: "guests",
    客人: "guests",
    guests: "guests",
    covers: "guests",
    人均消费: "avg_ticket",
    人均: "avg_ticket",
    客单价: "avg_ticket",
    avgticket: "avg_ticket",
    avg_ticket: "avg_ticket",
    营收: "revenue",
    营业收入: "revenue",
    收入: "revenue",
    销售额: "amount",
    销售金额: "amount",
    amount: "amount",
    revenue: "revenue",
    sales: "revenue",
    成本: "cost",
    食材成本: "cost",
    营业成本: "cost",
    cost: "cost",
    cogs: "cost",
    费用: "expense",
    开支: "expense",
    经营费用: "expense",
    房租人工: "expense",
    expense: "expense",
    opex: "expense",
    利润: "profit",
    毛利: "profit",
    净利润: "profit",
    profit: "profit",
    菜名: "name",
    品名: "name",
    名称: "name",
    name: "name",
    商品: "name",
    菜品: "name",
    分类: "category",
    类别: "category",
    category: "category",
    售价: "price",
    价格: "price",
    单价: "price",
    price: "price",
    销量: "qty",
    数量: "qty",
    份数: "qty",
    qty: "qty",
    quantity: "qty",
    类型: "kind",
    品类: "kind",
    kind: "kind",
    type: "kind",
  };
  return aliases[h] || aliases[raw.trim()] || "";
}

export function toNumber(raw: string | number | undefined): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const cleaned = String(raw)
    .replace(/[,，\s￥¥元]/g, "")
    .replace(/[()（）]/g, (ch) => (ch === "(" || ch === "（" ? "-" : ""));
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function normalizeMonth(raw: string): string | null {
  const s = String(raw).trim();
  if (!s) return null;
  const m1 = s.match(/^(\d{4})[-/.年](\d{1,2})/);
  if (m1) return `${m1[1]}-${String(Number(m1[2])).padStart(2, "0")}`;
  const m2 = s.match(/^(\d{1,2})[-/.月]/);
  if (m2) {
    const year = new Date().getFullYear();
    return `${year}-${String(Number(m2[1])).padStart(2, "0")}`;
  }
  const serial = Number(s);
  if (Number.isFinite(serial) && serial > 40000 && serial < 60000) {
    const utc = Math.round((serial - 25569) * 86400 * 1000);
    const d = new Date(utc);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    }
  }
  return null;
}

export function normalizeDate(raw: string): string | null {
  const s = String(raw).trim();
  if (!s) return null;
  const m1 = s.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (m1) {
    return `${m1[1]}-${String(Number(m1[2])).padStart(2, "0")}-${String(Number(m1[3])).padStart(2, "0")}`;
  }
  const serial = Number(s);
  if (Number.isFinite(serial) && serial > 40000 && serial < 60000) {
    const utc = Math.round((serial - 25569) * 86400 * 1000);
    const d = new Date(utc);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    }
  }
  // fallback: month-only not accepted for daily
  return null;
}

export function normalizeMealPeriod(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "未标注餐段";
  if (/午|lunch|午餐/.test(s)) return "午市";
  if (/晚|dinner|晚餐|正餐/.test(s)) return "晚市";
  if (/下午|tea|茶/.test(s)) return "下午茶";
  if (/夜|夜宵|night|宵夜/.test(s)) return "夜宵";
  if (/早|breakfast|早市/.test(s)) return "早市";
  if (/全|all/.test(s)) return "全天";
  return s;
}

export function downloadTextFile(fileName: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
