import type { FormState, IntakePhase } from "./intake";
import {
  CHURN_BANDS,
  EFF_BANDS,
  EVIDENCE_SOURCES,
  EXAM_DEPTH_OPTIONS,
  GUEST_TYPES,
  INTAKE_PHASES,
  PEAK_SCENES,
  SPEED_BANDS,
  STAGES,
  TREND_BANDS,
  TURNOVER_BANDS,
  UTIL_BANDS,
  intakeCompleteness,
} from "./intake";
import { DataImportPanel } from "./imports/DataImportPanel";

function BandChoices(props: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onPick: (value: string) => void;
}) {
  return (
    <div className="field">
      <label>{props.label}</label>
      <div className="choices" role="radiogroup" aria-label={props.label}>
        {props.options.map((item) => (
          <button
            key={item.value}
            type="button"
            className="choice"
            role="radio"
            aria-checked={props.value === item.value}
            data-on={props.value === item.value}
            onClick={() => props.onPick(item.value)}
          >
            <span className="choice-dot" aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function IntakeBrief(props: {
  phase: IntakePhase;
  form: FormState;
  onChange: (next: FormState) => void;
  error?: string | null;
}) {
  const meta = INTAKE_PHASES.find((item) => item.id === props.phase)!;
  const completeness = intakeCompleteness(props.form);
  const form = props.form;
  const set = (patch: Partial<FormState>) => props.onChange({ ...form, ...patch });

  return (
    <div className="mops-panel mops-doc mops-rise">
      <div className="intake-phase-head">
        <div>
          <p className="eyebrow">
            经营简报 · {meta.no}/{INTAKE_PHASES.length}
          </p>
          <h2 className="mops-serif-title">{meta.title}</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            {meta.feel}
            。经营体检必须有账本；菜单决定菜饮结构怎么读。
          </p>
        </div>
        <div className="intake-meter" aria-label={`简报完整度 ${completeness}%`}>
          <strong>{completeness}%</strong>
          <span>简报完整度</span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${completeness}%` }} />
          </div>
        </div>
      </div>

      <div className="intake-phase-rail" aria-hidden="true">
        {INTAKE_PHASES.map((item) => (
          <span
            key={item.id}
            className="intake-phase-chip"
            data-on={item.id === props.phase}
            data-passed={
              INTAKE_PHASES.findIndex((x) => x.id === item.id) <
              INTAKE_PHASES.findIndex((x) => x.id === props.phase)
            }
          >
            {item.no}. {item.title}
          </span>
        ))}
      </div>

      {props.error ? <p className="intake-error">{props.error}</p> : null}

      {props.phase === "identity" ? (
        <div className="intake-fields">
          <div className="field">
            <label>餐厅名称</label>
            <input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="例：湘味小馆"
              autoComplete="organization"
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>城市</label>
              <input value={form.city} onChange={(e) => set({ city: e.target.value })} />
            </div>
            <div className="field">
              <label>区域</label>
              <input
                value={form.district}
                onChange={(e) => set({ district: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label>详细地址（可选，利于竞争对照）</label>
            <input
              value={form.address}
              onChange={(e) => set({ address: e.target.value })}
              placeholder="例：岳麓大道某某号"
            />
          </div>
          <div className="field">
            <label>你做什么？</label>
            <select
              value={form.category}
              onChange={(e) => set({ category: e.target.value })}
            >
              {["湘菜", "川菜", "火锅", "烧烤", "茶饮", "其他"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {props.phase === "reality" ? (
        <div className="intake-fields">
          <div className="field">
            <label>这次想做浅检还是深检？</label>
            <div className="choices" role="radiogroup" aria-label="体检深度">
              {EXAM_DEPTH_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className="choice"
                  role="radio"
                  aria-checked={form.examDepth === item.value}
                  data-on={form.examDepth === item.value}
                  onClick={() => set({ examDepth: item.value })}
                >
                  <span className="choice-dot" aria-hidden="true" />
                  <span>
                    {item.label}
                    <small style={{ display: "block", opacity: 0.7 }}>{item.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {form.examDepth === "quick" ? (
            <div className="data-catalog-hint">
              <strong>浅检模式</strong>
              先用定位与体感画像；账本/销售/菜单可以先跳过，财务官与产品官会在数据不足时如实拒签，其余席位仍可给出判断。随时可切回「深检」补数据。
            </div>
          ) : (
            <div className="data-catalog-hint">
              <strong>采集目录（硬门槛）</strong>
              财务官要日×餐段（日期/餐段/区域/来客/人均/营收）；产品官要菜品销售结构；两边都要菜单主数据。
              缺硬门槛，对应专家会拒签——体检没有价值。
            </div>
          )}
          <DataImportPanel
            dailyOps={form.dailyOps}
            dailyOpsFileName={form.dailyOpsFileName}
            dishSales={form.dishSales}
            dishSalesFileName={form.dishSalesFileName}
            ledger={form.ledger}
            ledgerFileName={form.ledgerFileName}
            menu={form.menu}
            menuFileName={form.menuFileName}
            menuPhotoDataUrl={form.menuPhotoDataUrl}
            menuSource={form.menuSource}
            onDailyOps={({ dailyOps, dailyOpsFileName, ledger, bands }) =>
              set({
                dailyOps,
                dailyOpsFileName,
                ledger,
                // 一旦导入了合格账本，自动升级为深检，让财务/产品官按硬门槛出诊
                examDepth: dailyOps.length ? "deep" : form.examDepth,
                revenueTrend: bands?.revenueTrend || form.revenueTrend,
                profitPressure: bands?.profitPressure || form.profitPressure,
                costPressure: bands?.costPressure || form.costPressure,
                expensePressure: bands?.expensePressure || form.expensePressure,
                trafficTrend: bands?.trafficTrend || form.trafficTrend,
                priceRange:
                  form.priceRange.trim() ||
                  (bands?.avgTicket ? String(Math.round(bands.avgTicket)) : form.priceRange),
              })
            }
            onDishSales={({
              dishSales,
              dishSalesFileName,
              dishDrinkMix,
              contributionSense,
            }) =>
              set({
                dishSales,
                dishSalesFileName,
                dishDrinkMix,
                contributionSense,
              })
            }
            onLedger={({ ledger, ledgerFileName, bands }) =>
              set({
                ledger,
                ledgerFileName,
                revenueTrend: bands?.revenueTrend || form.revenueTrend,
                profitPressure: bands?.profitPressure || form.profitPressure,
                costPressure: bands?.costPressure || form.costPressure,
                expensePressure: bands?.expensePressure || form.expensePressure,
              })
            }
            onMenu={({
              menu,
              menuFileName,
              menuPhotoDataUrl,
              menuSource,
              dishDrinkMix,
              contributionSense,
            }) =>
              set({
                menu,
                menuFileName,
                menuPhotoDataUrl,
                menuSource,
                dishDrinkMix: form.dishSales.length ? form.dishDrinkMix : dishDrinkMix,
                contributionSense: form.dishSales.length
                  ? form.contributionSense
                  : contributionSense,
              })
            }
          />

          {form.dailyOps.length ? (
            <p className="import-ok" style={{ marginTop: 12 }}>
              已由日明细推导：营收 {form.revenueTrend || "—"} · 客流{" "}
              {form.trafficTrend || "—"} · 利润 {form.profitPressure || "—"} · 人均{" "}
              {form.priceRange || "—"}
            </p>
          ) : null}

          <div className="field-row" style={{ marginTop: 16 }}>
            <div className="field">
              <label>人均客单（元，可由日明细自动填）</label>
              <input
                value={form.priceRange}
                onChange={(e) => set({ priceRange: e.target.value })}
                placeholder="例：80"
                inputMode="numeric"
              />
            </div>
            <div className="field">
              <label>大约多少餐位</label>
              <input
                value={form.seats}
                onChange={(e) => set({ seats: e.target.value })}
                placeholder="例：60"
                inputMode="numeric"
              />
            </div>
          </div>
          <BandChoices
            label="客流趋势（有日明细时可自动推导，仍可手改）"
            value={form.trafficTrend}
            options={TREND_BANDS}
            onPick={(trafficTrend) => set({ trafficTrend })}
          />
          <BandChoices
            label="餐位/餐桌利用率体感"
            value={form.seatUtilization}
            options={UTIL_BANDS}
            onPick={(seatUtilization) => set({ seatUtilization })}
          />
          <div className="field">
            <label>门店现在处在什么阶段？</label>
            <div className="choices" role="radiogroup">
              {STAGES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className="choice"
                  role="radio"
                  aria-checked={form.stage === item.value}
                  data-on={form.stage === item.value}
                  onClick={() => set({ stage: item.value })}
                >
                  <span className="choice-dot" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>最忙的是哪种场景？</label>
            <div className="choices" role="radiogroup">
              {PEAK_SCENES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="choice"
                  role="radio"
                  aria-checked={form.peakScene === item}
                  data-on={form.peakScene === item}
                  onClick={() => set({ peakScene: item })}
                >
                  <span className="choice-dot" aria-hidden="true" />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>招牌菜 / 顾客记住你的点</label>
            <input
              value={form.signature}
              onChange={(e) => set({ signature: e.target.value })}
              placeholder="例：剁椒鱼头、氛围适合聚餐、性价比"
            />
          </div>
        </div>
      ) : null}

      {props.phase === "owner" ? (
        <div className="intake-fields">
          <p className="muted" style={{ marginBottom: 8 }}>
            运营轴需要翻台、人效、桌效、平效、流失——评论只能代理「上菜慢」。
          </p>
          <BandChoices
            label="翻台率体感"
            value={form.turnoverBand}
            options={TURNOVER_BANDS}
            onPick={(turnoverBand) => set({ turnoverBand })}
          />
          <BandChoices
            label="上菜速度体感"
            value={form.serveSpeedSense}
            options={SPEED_BANDS}
            onPick={(serveSpeedSense) => set({ serveSpeedSense })}
          />
          <BandChoices
            label="人效"
            value={form.laborEfficiency}
            options={EFF_BANDS}
            onPick={(laborEfficiency) => set({ laborEfficiency })}
          />
          <BandChoices
            label="桌效"
            value={form.tableEfficiency}
            options={EFF_BANDS}
            onPick={(tableEfficiency) => set({ tableEfficiency })}
          />
          <BandChoices
            label="平效"
            value={form.spaceEfficiency}
            options={EFF_BANDS}
            onPick={(spaceEfficiency) => set({ spaceEfficiency })}
          />
          <BandChoices
            label="员工流失"
            value={form.staffChurn}
            options={CHURN_BANDS}
            onPick={(staffChurn) => set({ staffChurn })}
          />
          <div className="field">
            <label>谁最常来？</label>
            <div className="choices" role="radiogroup">
              {GUEST_TYPES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="choice"
                  role="radio"
                  aria-checked={form.mainGuests === item}
                  data-on={form.mainGuests === item}
                  onClick={() => set({ mainGuests: item })}
                >
                  <span className="choice-dot" aria-hidden="true" />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>顾客最常夸什么？</label>
            <textarea
              rows={3}
              value={form.knownPraise}
              onChange={(e) => set({ knownPraise: e.target.value })}
              placeholder="例：菜比较正宗，环境适合拍照聚餐"
            />
          </div>
          <div className="field">
            <label>顾客最常抱怨什么？</label>
            <textarea
              rows={3}
              value={form.knownPain}
              onChange={(e) => set({ knownPain: e.target.value })}
              placeholder="例：周末等位久，上菜慢，服务跟不上高峰"
            />
          </div>
          <div className="field">
            <label>最近有没有大变化？（可选）</label>
            <input
              value={form.recentChange}
              onChange={(e) => set({ recentChange: e.target.value })}
              placeholder="例：换厨打、改菜单、涨价、扩了包厢"
            />
          </div>
        </div>
      ) : null}

      {props.phase === "focus" ? (
        <div className="intake-fields">
          <div className="field">
            <label>你现在最想弄清什么？</label>
            <div className="choices" role="radiogroup">
              {[
                "为什么生意下降？",
                "顾客到底喜欢什么？",
                "有没有增长机会？",
                "我的定位有没有问题？",
                "全面看看我的经营状态",
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="choice"
                  role="radio"
                  aria-checked={form.focus === item}
                  data-on={form.focus === item}
                  onClick={() => set({ focus: item })}
                >
                  <span className="choice-dot" aria-hidden="true" />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>这次优先看哪些外部声音？（体验轴）</label>
            <div className="choices">
              {EVIDENCE_SOURCES.map((item) => {
                const on = form.evidenceSources.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="choice"
                    data-on={on}
                    onClick={() => {
                      const next = on
                        ? form.evidenceSources.filter((id) => id !== item.id)
                        : [...form.evidenceSources, item.id];
                      set({ evidenceSources: next });
                    }}
                  >
                    <span className="choice-dot" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="intake-summary">
            <p className="eyebrow">即将对照的三轴</p>
            <ul className="checklist">
              <li>
                <span className="mark-ok">✓</span>
                <span>
                  日×餐段：{form.dailyOps.length} 条 · 菜品销售 {form.dishSales.length} 行
                  {form.revenueTrend ? ` · 营收${form.revenueTrend}` : ""}
                </span>
              </li>
              <li>
                <span className="mark-ok">✓</span>
                <span>
                  菜单：{form.menu.length} 项
                  {form.dishDrinkMix ? ` · ${form.dishDrinkMix}` : ""}
                </span>
              </li>
              <li>
                <span className="mark-ok">✓</span>
                <span>体验：价格 / 服务 / 菜品 / 环境（来自评价与内容）</span>
              </li>
              <li>
                <span className="mark-ok">✓</span>
                <span>
                  运营：翻台 {form.turnoverBand || "—"} · 人效 {form.laborEfficiency || "—"} · 上菜{" "}
                  {form.serveSpeedSense || "—"}
                </span>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
