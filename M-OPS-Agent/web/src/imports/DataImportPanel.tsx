import { useRef, useState } from "react";
import {
  MIN_DISH_SALES_ROWS,
  MIN_LEDGER_MONTHS,
  aggregateDailyToMonthly,
  assessDailyOpsQuality,
  deriveBandsFromDaily,
  deriveBandsFromLedger,
  deriveDishStructure,
  dailyOpsSummaryText,
  dishSalesSummaryText,
  ledgerSummaryText,
  parseDailyOpsMatrix,
  parseDishSalesMatrix,
  importDailyOpsFile,
  importDishSalesFile,
  importFinanceFile,
} from "./finance";
import {
  importMenuFile,
  importMenuPhoto,
  menuContributionSense,
  menuMixBand,
  menuSummaryText,
  parseMenuMatrix,
  parseMenuPaste,
} from "./menu";
import { downloadTextFile, parseDelimitedText } from "./parse-sheet";
import {
  DAILY_OPS_TEMPLATE_CSV,
  DISH_SALES_TEMPLATE_CSV,
  MENU_TEMPLATE_CSV,
  type DailyOpsRow,
  type DishSalesRow,
  type MenuItemRow,
  type MonthlyLedgerRow,
} from "./types";

/** 与 web/src/intake.ts buildOwnerFacts 的截断上限保持一致 */
const DAILY_OPS_TRUNCATE_AT = 400;
const DISH_SALES_TRUNCATE_AT = 500;

export function DataImportPanel(props: {
  dailyOps: DailyOpsRow[];
  dailyOpsFileName: string;
  dishSales: DishSalesRow[];
  dishSalesFileName: string;
  ledger: MonthlyLedgerRow[];
  ledgerFileName: string;
  menu: MenuItemRow[];
  menuFileName: string;
  menuPhotoDataUrl: string;
  menuSource: string;
  onDailyOps: (next: {
    dailyOps: DailyOpsRow[];
    dailyOpsFileName: string;
    ledger: MonthlyLedgerRow[];
    bands: ReturnType<typeof deriveBandsFromDaily>;
  }) => void;
  onDishSales: (next: {
    dishSales: DishSalesRow[];
    dishSalesFileName: string;
    dishDrinkMix: string;
    contributionSense: string;
  }) => void;
  onLedger: (next: {
    ledger: MonthlyLedgerRow[];
    ledgerFileName: string;
    bands: ReturnType<typeof deriveBandsFromLedger>;
  }) => void;
  onMenu: (next: {
    menu: MenuItemRow[];
    menuFileName: string;
    menuPhotoDataUrl: string;
    menuSource: string;
    dishDrinkMix: string;
    contributionSense: string;
  }) => void;
}) {
  const dailyRef = useRef<HTMLInputElement>(null);
  const dishRef = useRef<HTMLInputElement>(null);
  const monthlyRef = useRef<HTMLInputElement>(null);
  const menuExcelRef = useRef<HTMLInputElement>(null);
  const menuPhotoRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [paste, setPaste] = useState("");

  const dailyQ = assessDailyOpsQuality(props.dailyOps);

  async function onDaily(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const result = await importDailyOpsFile(file);
      const ledger = aggregateDailyToMonthly(result.rows);
      props.onDailyOps({
        dailyOps: result.rows,
        dailyOpsFileName: result.fileName,
        ledger,
        bands: deriveBandsFromDaily(result.rows),
      });
      const truncateNote =
        result.rows.length > DAILY_OPS_TRUNCATE_AT
          ? `；超过 ${DAILY_OPS_TRUNCATE_AT} 条的部分体检时会被截断，仅保留前 ${DAILY_OPS_TRUNCATE_AT} 条，建议拆分或汇总导入`
          : "";
      setNote(
        `日明细已导入：${dailyOpsSummaryText(result.rows)}${
          result.warnings[0] ? `（${result.warnings[0]}）` : ""
        }${truncateNote}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onDish(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const result = await importDishSalesFile(file);
      const struct = deriveDishStructure(result.rows);
      props.onDishSales({
        dishSales: result.rows,
        dishSalesFileName: result.fileName,
        dishDrinkMix: struct?.dishDrinkMix || "food_heavy",
        contributionSense: struct?.contributionSense || "medium",
      });
      const truncateNote =
        result.rows.length > DISH_SALES_TRUNCATE_AT
          ? `；超过 ${DISH_SALES_TRUNCATE_AT} 行的部分体检时会被截断，仅保留前 ${DISH_SALES_TRUNCATE_AT} 行，建议拆分或汇总导入`
          : "";
      setNote(
        `菜品销售已导入：${dishSalesSummaryText(result.rows)}${
          result.warnings[0] ? `（${result.warnings[0]}）` : ""
        }${truncateNote}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onMonthly(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const result = await importFinanceFile(file);
      props.onLedger({
        ledger: result.rows,
        ledgerFileName: result.fileName,
        bands: deriveBandsFromLedger(result.rows),
      });
      setNote(`月度汇总已导入（补成本费用）：${ledgerSummaryText(result.rows)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onMenuExcel(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const result = await importMenuFile(file);
      applyMenu(result.items, result.fileName, props.menuPhotoDataUrl, result.source);
      setNote(`菜单已导入：${menuSummaryText(result.items)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onMenuPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const result = await importMenuPhoto(file);
      props.onMenu({
        menu: props.menu.length ? props.menu : result.items,
        menuFileName: result.fileName,
        menuPhotoDataUrl: result.photoDataUrl || "",
        menuSource: "photo",
        dishDrinkMix: menuMixBand(props.menu.length ? props.menu : result.items),
        contributionSense: menuContributionSense(
          props.menu.length ? props.menu : result.items,
        ),
      });
      setNote(result.warnings[0] || "已保存菜单照片，请补录菜品");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function applyMenu(
    items: MenuItemRow[],
    fileName: string,
    photoDataUrl: string,
    source: string,
  ) {
    props.onMenu({
      menu: items,
      menuFileName: fileName,
      menuPhotoDataUrl: photoDataUrl,
      menuSource: source,
      dishDrinkMix: menuMixBand(items),
      contributionSense: menuContributionSense(items),
    });
  }

  return (
    <div className="import-panel">
      <div className="import-block">
        <div className="import-block-head">
          <div>
            <p className="eyebrow">必导 · 日×餐段经营明细</p>
            <strong>日期 / 餐段 / 区域 / 来客数 / 人均 / 营收</strong>
            <p className="muted">
              越细越好。至少覆盖 {MIN_LEDGER_MONTHS} 个月，或不少于 21 个营业日。可附成本/费用/利润。
            </p>
          </div>
          <div className="import-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                downloadTextFile("日餐段经营明细模板.csv", DAILY_OPS_TEMPLATE_CSV)
              }
            >
              下载模板
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                try {
                  const result = parseDailyOpsMatrix(
                    parseDelimitedText(DAILY_OPS_TEMPLATE_CSV),
                    "示例日明细.csv",
                  );
                  props.onDailyOps({
                    dailyOps: result.rows,
                    dailyOpsFileName: result.fileName,
                    ledger: aggregateDailyToMonthly(result.rows),
                    bands: deriveBandsFromDaily(result.rows),
                  });
                  setNote(`已填入示例日明细：${dailyOpsSummaryText(result.rows)}`);
                  setError(null);
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
              }}
            >
              填入示例
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => dailyRef.current?.click()}
            >
              导入日明细
            </button>
            <input
              ref={dailyRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv"
              hidden
              onChange={(e) => void onDaily(e.target.files?.[0])}
            />
          </div>
        </div>
        {dailyQ.ok ? (
          <div className="import-preview">
            <p className="import-ok">{dailyOpsSummaryText(props.dailyOps)}</p>
            <div className="import-table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>餐段</th>
                    <th>区域</th>
                    <th>来客</th>
                    <th>人均</th>
                    <th>营收</th>
                  </tr>
                </thead>
                <tbody>
                  {props.dailyOps.slice(0, 8).map((row, i) => (
                    <tr key={`${row.date}-${row.mealPeriod}-${row.zone}-${i}`}>
                      <td>{row.date}</td>
                      <td>{row.mealPeriod}</td>
                      <td>{row.zone}</td>
                      <td>{row.guests}</td>
                      <td>{Math.round(row.avgTicket)}</td>
                      <td>{fmt(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {props.dailyOps.length > 8 ? (
              <small className="muted">仅预览前 8 条，共 {props.dailyOps.length} 条</small>
            ) : null}
            {props.dailyOps.length > DAILY_OPS_TRUNCATE_AT ? (
              <p className="import-warn" style={{ marginTop: 6 }}>
                共 {props.dailyOps.length} 条，超过 {DAILY_OPS_TRUNCATE_AT} 条将在体检时被截断（仅取前{" "}
                {DAILY_OPS_TRUNCATE_AT} 条），建议按月拆分导入或先做月度汇总。
              </p>
            ) : null}
          </div>
        ) : (
          <p className="import-warn">
            {props.dailyOps.length
              ? dailyQ.reason
              : "尚未导入日×餐段明细。没有它，经营分析没有价值。"}
          </p>
        )}
      </div>

      <div className="import-block">
        <div className="import-block-head">
          <div>
            <p className="eyebrow">必导 · 菜品销售结构</p>
            <strong>日期 / 餐段 / 区域 / 菜名 / 销量 / 销售额</strong>
            <p className="muted">
              至少 {MIN_DISH_SALES_ROWS} 行，用来看贡献率与菜饮占比。越细越好。
            </p>
          </div>
          <div className="import-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                downloadTextFile("菜品销售结构模板.csv", DISH_SALES_TEMPLATE_CSV)
              }
            >
              下载模板
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                try {
                  const result = parseDishSalesMatrix(
                    parseDelimitedText(DISH_SALES_TEMPLATE_CSV),
                    "示例菜品销售.csv",
                  );
                  const struct = deriveDishStructure(result.rows);
                  props.onDishSales({
                    dishSales: result.rows,
                    dishSalesFileName: result.fileName,
                    dishDrinkMix: struct?.dishDrinkMix || "food_heavy",
                    contributionSense: struct?.contributionSense || "medium",
                  });
                  setNote(`已填入示例销售：${dishSalesSummaryText(result.rows)}`);
                  setError(null);
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
              }}
            >
              填入示例
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => dishRef.current?.click()}
            >
              导入销售
            </button>
            <input
              ref={dishRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv"
              hidden
              onChange={(e) => void onDish(e.target.files?.[0])}
            />
          </div>
        </div>
        {props.dishSales.length >= MIN_DISH_SALES_ROWS ? (
          <div className="import-preview">
            <p className="import-ok">{dishSalesSummaryText(props.dishSales)}</p>
            <div className="import-table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>餐段</th>
                    <th>菜名</th>
                    <th>销量</th>
                    <th>销售额</th>
                  </tr>
                </thead>
                <tbody>
                  {props.dishSales.slice(0, 8).map((row, i) => (
                    <tr key={`${row.date}-${row.dishName}-${i}`}>
                      <td>{row.date}</td>
                      <td>{row.mealPeriod}</td>
                      <td>{row.dishName}</td>
                      <td>{row.qty}</td>
                      <td>{fmt(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {props.dishSales.length > DISH_SALES_TRUNCATE_AT ? (
              <p className="import-warn" style={{ marginTop: 6 }}>
                共 {props.dishSales.length} 行，超过 {DISH_SALES_TRUNCATE_AT} 行将在体检时被截断（仅取前{" "}
                {DISH_SALES_TRUNCATE_AT} 行），建议按月拆分导入或先做汇总。
              </p>
            ) : null}
          </div>
        ) : (
          <p className="import-warn">
            尚未导入菜品销售结构（当前 {props.dishSales.length} 行）。
          </p>
        )}
      </div>

      <div className="import-block">
        <div className="import-block-head">
          <div>
            <p className="eyebrow">可选 · 月度成本费用汇总</p>
            <strong>补齐成本 / 费用 / 利润（若日明细未含）</strong>
            <p className="muted">不能替代日×餐段明细，只作财务科目补充。</p>
          </div>
          <div className="import-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => monthlyRef.current?.click()}
            >
              导入月汇总
            </button>
            <input
              ref={monthlyRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv"
              hidden
              onChange={(e) => void onMonthly(e.target.files?.[0])}
            />
          </div>
        </div>
        {props.ledger.length ? (
          <p className="import-ok">{ledgerSummaryText(props.ledger)}</p>
        ) : (
          <p className="muted" style={{ marginTop: 8 }}>
            日明细有成本费用时可自动汇总；否则可在此补月度表。
          </p>
        )}
      </div>

      <div className="import-block">
        <div className="import-block-head">
          <div>
            <p className="eyebrow">必导 · 菜单主数据</p>
            <strong>Excel / 拍照补录</strong>
            <p className="muted">菜名、售价；与销售结构对照看贡献。</p>
          </div>
          <div className="import-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => downloadTextFile("菜单模板.csv", MENU_TEMPLATE_CSV)}
            >
              下载模板
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                try {
                  const result = parseMenuMatrix(
                    parseDelimitedText(MENU_TEMPLATE_CSV),
                    "示例菜单.csv",
                    "csv",
                  );
                  applyMenu(result.items, result.fileName, props.menuPhotoDataUrl, "csv");
                  setNote(`已填入示例菜单：${menuSummaryText(result.items)}`);
                  setError(null);
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
              }}
            >
              填入示例
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => menuExcelRef.current?.click()}
            >
              Excel/CSV
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => menuPhotoRef.current?.click()}
            >
              拍照/相册
            </button>
            <input
              ref={menuExcelRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv"
              hidden
              onChange={(e) => void onMenuExcel(e.target.files?.[0])}
            />
            <input
              ref={menuPhotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => void onMenuPhoto(e.target.files?.[0])}
            />
          </div>
        </div>

        {props.menuPhotoDataUrl ? (
          <img
            className="menu-photo-preview"
            src={props.menuPhotoDataUrl}
            alt="菜单照片预览"
          />
        ) : null}

        <div className="field" style={{ marginTop: 10 }}>
          <label>或粘贴菜单文字（菜名 价格）</label>
          <textarea
            rows={3}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"剁椒鱼头 88\n小炒黄牛肉 68"}
          />
          <div className="import-actions" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                try {
                  const result = parseMenuPaste(paste);
                  applyMenu(
                    result.items,
                    result.fileName,
                    props.menuPhotoDataUrl,
                    "paste",
                  );
                  setNote(`已从粘贴识别 ${result.items.length} 个品项`);
                  setError(null);
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
              }}
            >
              解析粘贴
            </button>
          </div>
        </div>

        {props.menu.length ? (
          <p className="import-ok" style={{ marginTop: 8 }}>
            {menuSummaryText(props.menu)}
          </p>
        ) : (
          <p className="import-warn">尚未导入菜单主数据。</p>
        )}
      </div>

      {error ? <p className="intake-error">{error}</p> : null}
      {note ? <p className="import-ok">{note}</p> : null}
    </div>
  );
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("zh-CN");
}
