import {
  headerIndexMap,
  parseDelimitedText,
  sheetToMatrix,
  toNumber,
} from "./parse-sheet";
import type { MenuImportResult, MenuItemRow } from "./types";

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeKind(raw: string): MenuItemRow["kind"] {
  const s = raw.trim().toLowerCase();
  if (/饮|酒|茶|咖啡|drink|beverage/.test(s)) return "drink";
  if (/菜|热菜|凉菜|主食|dish|food|餐/.test(s)) return "dish";
  if (s === "drink" || s === "dish" || s === "other") return s;
  return "other";
}

export function parseMenuMatrix(
  matrix: string[][],
  fileName: string,
  source: MenuImportResult["source"],
): MenuImportResult {
  if (matrix.length < 2) {
    throw new Error("菜单至少需要表头 + 一行菜品");
  }
  const header = matrix[0] || [];
  const idx = headerIndexMap(header);
  if (idx.name === undefined || idx.price === undefined) {
    throw new Error("菜单表头需至少包含：菜名、售价（可选：分类、成本、类型）");
  }

  const warnings: string[] = [];
  const items: MenuItemRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] || [];
    if (line.every((cell) => !String(cell || "").trim())) continue;
    const name = String(line[idx.name!] ?? "").trim();
    const price = toNumber(line[idx.price!]);
    if (!name || price === null) {
      warnings.push(`第 ${i + 1} 行菜名/售价无效，已跳过`);
      continue;
    }
    const category =
      idx.category !== undefined
        ? String(line[idx.category] ?? "").trim() || "未分类"
        : "未分类";
    const cost =
      idx.cost !== undefined ? toNumber(line[idx.cost]) ?? undefined : undefined;
    const kindRaw =
      idx.kind !== undefined ? String(line[idx.kind] ?? "") : category;
    items.push({
      id: newId("menu"),
      name,
      category,
      price,
      cost: cost ?? undefined,
      kind: normalizeKind(kindRaw),
    });
  }

  if (!items.length) throw new Error("没有解析到有效菜品");
  return { items, fileName, source, warnings };
}

export async function importMenuFile(file: File): Promise<MenuImportResult> {
  const { matrix, fileName } = await sheetToMatrix(file);
  const source = fileName.toLowerCase().endsWith(".csv") ? "csv" : "excel";
  return parseMenuMatrix(matrix, fileName, source);
}

/** 拍照：保存图片，并用轻量行解析尝试提取「菜名 + 价格」；失败则返回空表待核对 */
export async function importMenuPhoto(file: File): Promise<MenuImportResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请上传菜单照片（jpg/png/webp）");
  }
  const photoDataUrl = await readAsDataUrl(file);
  // 浏览器端暂无稳定中文 OCR 服务：先挂照片，支持用户粘贴/补录对照。
  // 若未来接入 OCR，在此替换。
  return {
    items: [],
    fileName: file.name,
    source: "photo",
    photoDataUrl,
    warnings: [
      "已保存菜单照片。当前版本请对照照片补录菜名与售价，或改用 Excel/CSV 导入。",
    ],
  };
}

export function parseMenuPaste(text: string): MenuImportResult {
  const matrix = parseDelimitedText(text);
  if (matrix.length >= 2 && /菜名|名称|品名|name/i.test(matrix[0]?.[0] || "")) {
    return parseMenuMatrix(matrix, "paste.txt", "paste");
  }
  // 自由行：菜名 88 / 菜名,88 / 菜名\t88
  const items: MenuItemRow[] = [];
  const warnings: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(.+?)[\s,，\t]+(\d+(?:\.\d+)?)\s*$/);
    if (!m) {
      warnings.push(`无法解析：${line}`);
      continue;
    }
    items.push({
      id: newId("menu"),
      name: m[1]!.trim(),
      category: "未分类",
      price: Number(m[2]),
      kind: "dish",
    });
  }
  if (!items.length) throw new Error("粘贴内容未能识别菜名与价格");
  return { items, fileName: "paste.txt", source: "paste", warnings };
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取照片失败"));
    reader.readAsDataURL(file);
  });
}

export function menuMixBand(items: MenuItemRow[]): "food_heavy" | "balanced" | "drink_heavy" {
  if (!items.length) return "food_heavy";
  const dish = items.filter((i) => i.kind === "dish").length;
  const drink = items.filter((i) => i.kind === "drink").length;
  const total = Math.max(1, dish + drink);
  const drinkShare = drink / total;
  if (drinkShare >= 0.45) return "drink_heavy";
  if (drinkShare <= 0.2) return "food_heavy";
  return "balanced";
}

export function menuContributionSense(
  items: MenuItemRow[],
): "high" | "medium" | "low" {
  if (items.length < 5) return "low";
  const priced = items.filter((i) => i.price > 0);
  if (!priced.length) return "low";
  const sorted = [...priced].sort((a, b) => b.price - a.price);
  const top = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.2)));
  const topSum = top.reduce((s, i) => s + i.price, 0);
  const allSum = priced.reduce((s, i) => s + i.price, 0);
  const share = topSum / Math.max(1, allSum);
  if (share >= 0.45) return "high";
  if (share >= 0.3) return "medium";
  return "low";
}

export function menuSummaryText(items: MenuItemRow[]) {
  if (!items.length) return "尚未导入菜单";
  const drink = items.filter((i) => i.kind === "drink").length;
  const dish = items.filter((i) => i.kind === "dish").length;
  return `${items.length} 个品项｜菜 ${dish} · 饮 ${drink} · 均价 ${Math.round(
    items.reduce((s, i) => s + i.price, 0) / items.length,
  )} 元`;
}
