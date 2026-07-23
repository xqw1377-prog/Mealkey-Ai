import { useMemo, useState } from "react";
import type { RestaurantDiagnosisResult } from "@mealkey/m-ops-diag";

export type ProfileFact = {
  label: string;
  value: string;
};

export type VoiceQuote = {
  text: string;
  source?: string;
};

export type TrendItem = {
  id: string;
  asOf: string;
  summary: string;
  risk: string;
  dimension?: string;
};

export type CaseItem = {
  id: string;
  status: string;
  trigger: string;
  impactScore: number;
  title: string;
  createdAt?: string;
  observation?: string;
  pattern?: string;
  meaning?: string;
  decisionTopic?: string;
  evidence?: Array<{ source: string; fact: string }>;
  observations?: Array<{ statement: string; confidence: number }>;
  patterns?: Array<{ name: string; confidence: number }>;
  hypotheses?: Array<{
    statement: string;
    probability: number;
    validationPlan?: string[];
  }>;
  validations?: string[];
};

export type LearningItem = {
  id: string;
  diagnosisId: string;
  hypothesis: string;
  action?: string;
  expectedOutcome?: string;
  actualOutcome?: string;
  lesson?: string;
};

function polishText(input?: string) {
  if (!input) return "";
  return input
    .replace(/\bcustomer\b/g, "顾客")
    .replace(/\bproduct\b/g, "产品")
    .replace(/\bservice\b/g, "服务")
    .replace(/\boperation\b/g, "运营")
    .replace(/\bcompetition\b/g, "竞争")
    .replace(/\bgrowth\b/g, "增长")
    .replace(/\bhealthy\b/g, "稳定")
    .replace(/\bobserve\b/g, "观察")
    .replace(/\battention\b/g, "关注")
    .replace(/\brisk\b/g, "风险")
    .replace(/\bcritical\b/g, "严重");
}

/** 03 · 我的餐厅经营画像 */
export function PortraitView(props: {
  name: string;
  city: string;
  district: string;
  category: string;
  hero: string;
  completeness: string;
  updatedAt?: string;
  profileFacts: ProfileFact[];
  result: RestaurantDiagnosisResult;
  dimensionLabel: (dimension?: string) => string;
  levelStars: (level?: string) => string;
}) {
  const dims = props.result.health?.snapshot?.dimensions || [];
  return (
    <div className="mops-panel mops-doc mops-rise">
      <p className="eyebrow">经营体检 · 03</p>
      <h2 className="mops-serif-title">我的餐厅经营画像</h2>

      <div className="identity-bar">
        <strong>{props.name}</strong>
        <span>
          {props.city}
          {props.district ? ` · ${props.district}` : ""}
          {props.category ? ` · ${props.category}` : ""}
        </span>
        <span>观察完整度 {props.completeness}</span>
        {props.updatedAt ? <span>更新 {props.updatedAt}</span> : null}
      </div>

      <p className="mops-hero-quote">{props.hero}</p>

      {props.result.evolution ? (
        <div className="evolution-meter" style={{ marginTop: 16 }}>
          <div className="evolution-meter-head">
            <span>
              门店 DNA · {props.result.evolution.stage}
            </span>
            <strong>成熟度 {props.result.evolution.maturityScore}</strong>
          </div>
          <div className="evolution-meter-track" aria-hidden>
            <div
              className="evolution-meter-fill"
              style={{ width: `${Math.min(100, props.result.evolution.maturityScore)}%` }}
            />
          </div>
          <p className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>
            {props.result.evolution.summary}
          </p>
        </div>
      ) : null}

      {props.result.exam?.axes?.length ? (
        <>
          <div className="section-heading" style={{ marginTop: 22 }}>
            <p className="eyebrow">三轴体检</p>
            <h2 className="mops-serif-title" style={{ fontSize: "1.15rem" }}>
              {props.result.exam.summary}
            </h2>
            <p className="muted" style={{ marginTop: 6 }}>
              经营靠自报 KPI，体验靠外部声音，运营靠效率档位——单靠点评不够。
            </p>
          </div>
          <div className="exam-axis-grid">
            {props.result.exam.axes.map((axis) => (
              <div key={axis.axis} className="exam-axis-card" data-level={axis.level}>
                <div className="exam-axis-head">
                  <strong>{axis.title}</strong>
                  <span>{props.levelStars(axis.level)}</span>
                </div>
                <p>{axis.summary}</p>
                <ul>
                  {axis.metrics
                    .filter((m) => m.source !== "missing")
                    .slice(0, 5)
                    .map((m) => (
                      <li key={m.id}>
                        <span>{m.label}</span>
                        <em>{m.reading}</em>
                      </li>
                    ))}
                </ul>
                {axis.gaps.filter((g) => g.severity === "high").length ? (
                  <small className="exam-axis-gap">
                    缺口：
                    {axis.gaps
                      .filter((g) => g.severity === "high")
                      .slice(0, 2)
                      .map((g) => g.field)
                      .join("、")}
                  </small>
                ) : null}
              </div>
            ))}
          </div>
          {props.result.consultation ? (
            <p className="muted" style={{ marginTop: 12 }}>
              正式咨询意见见「06 会审报告」：汇总结论为主，四官讨论观点可追溯。
            </p>
          ) : null}
        </>
      ) : null}

      <div className="section-heading" style={{ marginTop: 22 }}>
        <p className="eyebrow">六个经营观察面</p>
        <h2 className="mops-serif-title" style={{ fontSize: "1.15rem" }}>
          星级代表观察完整度与证据强度，不是经营总分。
        </h2>
      </div>

      {dims.length ? (
        <div className="observe-grid">
          {dims.map((item) => (
            <div key={item.dimension} className="observe-cell">
              <span>{props.dimensionLabel(item.dimension)}</span>
              <strong>{props.levelStars(item.level)}</strong>
              <small>
                {item.delta.direction === "down"
                  ? "风险上升"
                  : item.delta.direction === "up"
                    ? "正在改善"
                    : "保持观察"}
              </small>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ marginTop: 12 }}>
          证据尚少，观察面会随扫描逐渐展开。
        </p>
      )}

      <div className="section-heading" style={{ marginTop: 22 }}>
        <p className="eyebrow">经营身份</p>
      </div>
      <ul className="fact-list">
        {props.profileFacts.map((item) => (
          <li key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </li>
        ))}
      </ul>

      {props.result.gaps.filter((g) => g.severity !== "low").length > 0 ? (
        <>
          <p className="muted" style={{ marginTop: 16 }}>
            下一步最值得补齐 / 验证
          </p>
          <ul className="checklist">
            {props.result.gaps
              .filter((g) => g.severity !== "low")
              .slice(0, 8)
              .map((g) => (
              <li key={g.field}>
                <span className="mark-gap">?</span>
                <span>
                  {g.field}：{g.reason}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/** 04 · 顾客声音墙 */
export function VoicesView(props: {
  voiceBuckets: {
    likes: VoiceQuote[];
    hesitates: VoiceQuote[];
    leaves: VoiceQuote[];
  };
  summary?: string;
}) {
  return (
    <div className="mops-panel mops-doc mops-rise">
      <p className="eyebrow">经营体检 · 04</p>
      <h2 className="mops-serif-title">顾客正在这样谈论你</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        每条声音可追溯来源；无证据不编造引用。
      </p>

      <div className="wall">
        <div className="wall-col" data-tone="like">
          <h3>顾客喜欢</h3>
          {props.voiceBuckets.likes.length ? (
            props.voiceBuckets.likes.map((e, index) => (
              <div key={`like-${index}`} className="quote">
                「{e.text}」
                <div className="status">{e.source || `来源 ${index + 1}`}</div>
              </div>
            ))
          ) : (
            <p className="muted">暂无正向样本</p>
          )}
        </div>
        <div className="wall-col" data-tone="hesitate">
          <h3>顾客犹豫</h3>
          {props.voiceBuckets.hesitates.length ? (
            props.voiceBuckets.hesitates.map((e, index) => (
              <div key={`hes-${index}`} className="quote">
                「{e.text}」
                <div className="status">{e.source || `来源 ${index + 1}`}</div>
              </div>
            ))
          ) : (
            <p className="muted">暂无中性样本</p>
          )}
        </div>
        <div className="wall-col" data-tone="leave">
          <h3>顾客离开</h3>
          {props.voiceBuckets.leaves.length ? (
            props.voiceBuckets.leaves.map((e, index) => (
              <div key={`leave-${index}`} className="quote">
                「{e.text}」
                <div className="status">{e.source || `来源 ${index + 1}`}</div>
              </div>
            ))
          ) : (
            <p className="muted">暂无负向样本</p>
          )}
        </div>
      </div>

      {props.summary ? <p className="mops-hero-quote">{props.summary}</p> : null}
    </div>
  );
}

/** 05 · 今日经营扫描 */
export function TodayScanView(props: {
  name: string;
  pulseHealthText: string;
  pulseSummary: {
    topRisk?: { finding?: string; dimension?: string; delta?: { summary?: string } };
    topOpportunity?: { finding?: string; delta?: { summary?: string } };
    stable?: { finding?: string; delta?: { summary?: string } };
  } | null;
  result: RestaurantDiagnosisResult;
}) {
  const signal = props.result.signals[0];
  return (
    <div className="page-stack">
      <div className="mops-panel mops-doc mops-rise">
        <p className="eyebrow">经营体检 · 05</p>
        <h2 className="mops-serif-title">今日经营扫描</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          {props.name} · {props.pulseHealthText}
        </p>

        <div className="scan-stack">
          <div className="scan-item" data-tone="risk">
            <h3>需要关注</h3>
            <p>
              {props.pulseSummary?.topRisk?.finding ||
                polishText(signal?.observation) ||
                "暂无高风险信号"}
            </p>
            <p className="muted" style={{ marginTop: 6 }}>
              {polishText(props.pulseSummary?.topRisk?.delta?.summary) ||
                polishText(signal?.pattern)}
            </p>
          </div>
          <div className="scan-item" data-tone="opportunity">
            <h3>机会</h3>
            <p>{props.pulseSummary?.topOpportunity?.finding || "增长机会仍在观察"}</p>
            <p className="muted" style={{ marginTop: 6 }}>
              {polishText(props.pulseSummary?.topOpportunity?.delta?.summary) ||
                polishText(props.result.signals[1]?.pattern) ||
                "继续跟踪内容与招牌菜心智"}
            </p>
          </div>
          <div className="scan-item">
            <h3>稳定项</h3>
            <p>{props.pulseSummary?.stable?.finding || "顾客基础印象仍然稳定"}</p>
            <p className="muted" style={{ marginTop: 6 }}>
              {polishText(props.pulseSummary?.stable?.delta?.summary) ||
                "当前未出现需要升格的额外异常"}
            </p>
          </div>
        </div>
      </div>

      {signal ? (
        <div className="mops-panel mops-rise mops-rise-delay-1">
          <p className="eyebrow">建议关注 · 非战略拍板</p>
          <div className="diag">
            <h3>{signal.title}</h3>
            <p className="muted">看见了什么</p>
            <p>{signal.observation}</p>
            <p className="muted">像什么问题</p>
            <p>{polishText(signal.pattern)}</p>
            <p className="muted">可能影响</p>
            <p>{signal.impact}</p>
            {signal.recommendedValidation?.length ? (
              <>
                <p className="muted">建议验证</p>
                <ul className="checklist">
                  {signal.recommendedValidation.map((item) => (
                    <li key={item}>
                      <span className="mark-ok">→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CasesView(props: { trendItems: TrendItem[]; caseItems: CaseItem[] }) {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(
    props.caseItems[0]?.id || null,
  );

  const activeCase = useMemo(() => {
    return (
      props.caseItems.find((item) => item.id === selectedCaseId) ||
      props.caseItems[0] ||
      null
    );
  }, [props.caseItems, selectedCaseId]);

  return (
    <div className="mops-panel mops-rise">
      <p className="eyebrow">病例沉淀</p>
      <h2 className="mops-serif-title">把异常拉回可复核的病例</h2>

      <div className="section-heading" style={{ marginTop: 16 }}>
        <p className="eyebrow">最近变化</p>
      </div>
      {props.trendItems.length ? (
        <div className="timeline">
          {props.trendItems.map((item) => (
            <div key={item.id} className="timeline-item">
              <div className="timeline-dot" />
              <div>
                <p className="timeline-time">{new Date(item.asOf).toLocaleString()}</p>
                <strong>{item.risk}</strong>
                <p className="muted">{item.summary}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">还没有形成连续趋势。</p>
      )}

      <div className="case-detail-layout">
        <div>
          <p className="eyebrow">病例列表</p>
          {props.caseItems.length ? (
            <ul className="case-list" style={{ marginTop: 8 }}>
              {props.caseItems.map((item) => (
                <li
                  key={item.id}
                  className="case-row"
                  data-on={activeCase?.id === item.id}
                  onClick={() => setSelectedCaseId(item.id)}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <p className="muted">触发：{polishText(item.trigger)}</p>
                  </div>
                  <div className="case-meta">
                    <span>{item.status}</span>
                    <span>影响 {item.impactScore}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">还没有形成可回放病例。</p>
          )}
        </div>

        <div>
          <p className="eyebrow">病例详情</p>
          {activeCase ? (
            <div className="case-detail" style={{ marginTop: 8 }}>
              <div className="detail-block">
                <span className="muted">标题</span>
                <strong>{activeCase.title}</strong>
              </div>
              <div className="detail-block">
                <span className="muted">看见了什么</span>
                <p>{polishText(activeCase.observation) || "暂无"}</p>
              </div>
              <div className="detail-block">
                <span className="muted">像什么问题</span>
                <p>{polishText(activeCase.pattern) || "暂无"}</p>
              </div>
              <div className="detail-block">
                <span className="muted">经营含义</span>
                <p>{polishText(activeCase.meaning) || "暂无"}</p>
              </div>
              <div className="detail-block">
                <span className="muted">证据</span>
                {activeCase.evidence?.length ? (
                  <ul className="detail-list">
                    {activeCase.evidence.map((item, index) => (
                      <li key={`${item.source}-${index}`}>
                        <strong>{item.source}</strong>
                        <span>{item.fact}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">暂无更多证据片段。</p>
                )}
              </div>
              <div className="detail-block">
                <span className="muted">假设（按概率排序）</span>
                {activeCase.hypotheses?.length ? (
                  <ul className="detail-list">
                    {activeCase.hypotheses.map((item, index) => (
                      <li key={`hyp-${index}`}>
                        <strong>{polishText(item.statement)}</strong>
                        <span>概率 {Math.round(item.probability * 100)}%</span>
                        {item.validationPlan?.length ? (
                          <em style={{ display: "block", marginTop: 4 }}>
                            验证：{item.validationPlan.join("；")}
                          </em>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">暂无假设，需要更多证据支撑。</p>
                )}
              </div>
              <div className="detail-block">
                <span className="muted">建议验证动作</span>
                {activeCase.validations?.length ? (
                  <ul className="checklist">
                    {activeCase.validations.map((item, index) => (
                      <li key={`val-${index}`}>
                        <span className="mark-ok">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">暂无建议验证动作。</p>
                )}
              </div>
              <div className="detail-block">
                <span className="muted">决策议题（回餐启拍板）</span>
                <p>{activeCase.decisionTopic || "尚未形成明确议题"}</p>
              </div>
            </div>
          ) : (
            <p className="muted">还没有可查看的病例详情。</p>
          )}
        </div>
      </div>
    </div>
  );
}

const LEARNING_POLARITY_CHOICES: Array<{ value: string; label: string }> = [
  { value: "验证成立", label: "成立" },
  { value: "验证不成立", label: "不成立" },
  { value: "尚不确定", label: "尚不确定" },
];

export function LearningView(props: {
  learningItems: LearningItem[];
  evolutionSummary?: string;
  maturityScore?: number;
  evolutionStage?: string;
  topLessons?: string[];
  onUpdateLearning: (input: {
    diagnosisId: string;
    hypothesis: string;
    action?: string;
    actualOutcome?: string;
    lesson?: string;
  }) => void;
  onRescan?: () => void;
  rescanBusy?: boolean;
}) {
  const stage = props.evolutionStage || "seed";
  const maturity = props.maturityScore ?? 0;
  return (
    <div className="mops-panel mops-rise mops-rise-delay-1" style={{ marginTop: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div>
          <p className="eyebrow">系统学习与进化</p>
          <h2 className="mops-serif-title">回填结果，让下一轮判断更准</h2>
        </div>
        {props.onRescan ? (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={props.rescanBusy}
            onClick={() => props.onRescan?.()}
          >
            {props.rescanBusy ? "重新扫描中…" : "回填后重新扫描"}
          </button>
        ) : null}
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        {props.evolutionSummary ||
          "填写「成立 / 不成立」会写入门店 DNA，并调整假设权重与模式库。"}
      </p>

      <div className="evolution-meter" style={{ marginTop: 14 }}>
        <div className="evolution-meter-head">
          <span>进化阶段 · {stage}</span>
          <strong>成熟度 {maturity}</strong>
        </div>
        <div className="evolution-meter-track" aria-hidden>
          <div className="evolution-meter-fill" style={{ width: `${Math.min(100, maturity)}%` }} />
        </div>
        {props.topLessons?.length ? (
          <ul className="evolution-lessons">
            {props.topLessons.slice(0, 3).map((lesson) => (
              <li key={lesson}>{lesson}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {props.learningItems.length ? (
        <ul className="learning-list" style={{ marginTop: 14 }}>
          {props.learningItems.map((item) => (
            <li key={item.id}>
              <strong>{item.hypothesis}</strong>
              <p className="muted">预期验证：{item.expectedOutcome || "等待后续动作回填"}</p>
              <div className="choices" role="radiogroup" aria-label="回填判定" style={{ marginTop: 8 }}>
                {LEARNING_POLARITY_CHOICES.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    className="choice"
                    role="radio"
                    aria-checked={item.actualOutcome === choice.value}
                    data-on={item.actualOutcome === choice.value}
                    onClick={() =>
                      props.onUpdateLearning({
                        diagnosisId: item.diagnosisId,
                        hypothesis: item.hypothesis,
                        action: item.action,
                        actualOutcome: choice.value,
                        lesson: item.lesson,
                      })
                    }
                  >
                    <span className="choice-dot" aria-hidden="true" />
                    <span>{choice.label}</span>
                  </button>
                ))}
              </div>
              <div className="learning-form">
                <input
                  defaultValue={item.action || ""}
                  placeholder="本次采取了什么动作？"
                  onBlur={(e) =>
                    props.onUpdateLearning({
                      diagnosisId: item.diagnosisId,
                      hypothesis: item.hypothesis,
                      action: e.target.value,
                      actualOutcome: item.actualOutcome,
                      lesson: item.lesson,
                    })
                  }
                />
                <input
                  defaultValue={item.actualOutcome || ""}
                  placeholder="实际结果如何？（例：验证成立 / 不成立）"
                  onBlur={(e) =>
                    props.onUpdateLearning({
                      diagnosisId: item.diagnosisId,
                      hypothesis: item.hypothesis,
                      action: item.action,
                      actualOutcome: e.target.value,
                      lesson: item.lesson,
                    })
                  }
                />
                <textarea
                  defaultValue={item.lesson || ""}
                  placeholder="系统学到了什么？"
                  rows={3}
                  onBlur={(e) =>
                    props.onUpdateLearning({
                      diagnosisId: item.diagnosisId,
                      hypothesis: item.hypothesis,
                      action: item.action,
                      actualOutcome: item.actualOutcome,
                      lesson: e.target.value,
                    })
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted" style={{ marginTop: 12 }}>
          还没有形成可复用的学习记录。完成一次体检后，在此回填结果即可启动进化。
        </p>
      )}
    </div>
  );
}
