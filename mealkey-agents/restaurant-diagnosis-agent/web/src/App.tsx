import { useMemo, useState } from "react";
import {
  createAgentClient,
  type ContextPackageV1,
} from "@mealkey/agent-sdk/platform";
import { runRestaurantDiagnosisSkill } from "@agent/skill";
import type { RestaurantDiagnosisResult } from "@mealkey/m-ops-diag";

type Step = "onboarding" | "working" | "portrait";

type FormState = {
  name: string;
  city: string;
  district: string;
  category: string;
  focus: string;
};

const FOCI = [
  "为什么生意下降？",
  "顾客到底喜欢什么？",
  "有没有增长机会？",
  "我的定位有没有问题？",
  "全面看看我的经营状态",
];

const DEMO_EVIDENCE = [
  {
    id: "d1",
    source: "大众点评",
    claim: "环境适合朋友聚餐，拍照好看",
    sentiment: "positive" as const,
    theme: "environment",
  },
  {
    id: "d2",
    source: "大众点评",
    claim: "菜味道比较正宗",
    sentiment: "positive" as const,
    theme: "product",
  },
  {
    id: "d3",
    source: "大众点评",
    claim: "周末等位太久，上菜慢",
    sentiment: "negative" as const,
    theme: "wait",
  },
  {
    id: "d4",
    source: "大众点评",
    claim: "服务跟不上高峰",
    sentiment: "negative" as const,
    theme: "wait",
  },
  {
    id: "d5",
    source: "小红书",
    claim: "适合聚会，但要做好久等的心理准备",
    sentiment: "neutral" as const,
    theme: "wait",
  },
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function App() {
  const [step, setStep] = useState<Step>("onboarding");
  const [form, setForm] = useState<FormState>({
    name: "湘味小馆",
    city: "长沙",
    district: "岳麓区",
    category: "湘菜",
    focus: FOCI[4]!,
  });
  const [workLines, setWorkLines] = useState<
    Array<{ ok: boolean; text: string }>
  >([]);
  const [result, setResult] = useState<RestaurantDiagnosisResult | null>(null);
  const [ctx, setCtx] = useState<ContextPackageV1 | null>(null);
  const [syncNote, setSyncNote] = useState("");
  const [busy, setBusy] = useState(false);

  const osBase =
    (import.meta as { env?: { VITE_OS_WEB_URL?: string } }).env
      ?.VITE_OS_WEB_URL || "http://localhost:3000";

  const hero = useMemo(() => {
    if (!result) return "";
    const like = result.customerLens?.theyThink?.[0];
    const risk = result.customerLens?.biggestRisk || result.signals[0]?.title;
    if (like && risk) {
      return `顾客认可「${like}」，同时「${risk}」正在成为体验瓶颈。`;
    }
    if (result.findings[0]?.meaning) return result.findings[0].meaning;
    return "已根据现有证据形成初步经营认知；更多公开评价将提升完整度。";
  }, [result]);

  async function startDiagnosis() {
    if (!form.name.trim() || !form.city.trim()) return;
    setBusy(true);
    setStep("working");
    setWorkLines([]);
    setSyncNote("");

    const lines = [
      { ok: true, text: `品牌：${form.name}` },
      { ok: true, text: `品类：${form.category}` },
      { ok: true, text: `区域：${form.city}${form.district}` },
      { ok: true, text: "收集顾客评价样本（演示源 / 本地证据）" },
      { ok: true, text: "分析消费者反馈主题" },
      {
        ok: false,
        text: "附近同类餐厅核验：演示模式暂无地图实源（诚实降级）",
      },
      { ok: true, text: "形成经营认知与诊断卡" },
    ];

    for (const line of lines) {
      await sleep(380);
      setWorkLines((prev) => [...prev, line]);
    }

    const packageCtx: ContextPackageV1 = {
      restaurantId: `local-${Date.now()}`,
      asOf: new Date().toISOString(),
      scopesGranted: ["basic", "facts", "review"],
      scopesDenied: ["market"],
      identity: {
        brand: form.name,
        storeName: form.name,
        city: form.city,
        district: form.district,
        category: form.category,
      },
      facts: [
        { kind: "focus", claim: `当前最想知道：${form.focus}` },
      ],
      evidence: DEMO_EVIDENCE,
    };

    const skill = runRestaurantDiagnosisSkill(packageCtx);
    setCtx(packageCtx);
    setResult(skill.result);

    // 尝试经 Gateway 同步（web dev 代理 /api）
    try {
      const mk = createAgentClient({
        agentId: "restaurant-diagnosis",
        clientSecret:
          (import.meta as { env?: { VITE_MK_AGENT_SECRET?: string } }).env
            ?.VITE_MK_AGENT_SECRET || "mk-sandbox-agent-secret",
        baseUrl: "/api",
      });
      if (skill.ingressItems.length) {
        const ack = await mk.submitIngress({
          restaurantId: packageCtx.restaurantId,
          invokeId: `web-${Date.now()}`,
          userAccessToken: "sandbox",
          horizon: "7d",
          items: skill.ingressItems,
        });
        setSyncNote(
          ack.accepted.length
            ? `已同步 ${ack.accepted.length} 条信号到 MealKey Gateway（可回今日查看）`
            : `Gateway 已响应，但未接受信号（${ack.rejected[0]?.code || "unknown"}）`,
        );
      }
    } catch {
      setSyncNote(
        "本地诊断已完成；Gateway 未连接时不会写入今日。启动 MealKey Web 后可自动同步。",
      );
    }

    await sleep(400);
    setStep("portrait");
    setBusy(false);
  }

  const likes = (ctx?.evidence || []).filter((e) => e.sentiment === "positive");
  const leaves = (ctx?.evidence || []).filter((e) => e.sentiment === "negative");
  const hesitates = (ctx?.evidence || []).filter(
    (e) => e.sentiment === "neutral",
  );

  return (
    <div className="app">
      {step === "onboarding" && (
        <>
          <h1 className="brand">餐启经营诊断</h1>
          <p className="lede">花几分钟，让我先认识你的店。</p>
          <div className="card">
            <div className="field">
              <label>餐厅名称</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例：湘味小馆"
              />
            </div>
            <div className="field">
              <label>城市</label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="field">
              <label>区域</label>
              <input
                value={form.district}
                onChange={(e) =>
                  setForm({ ...form, district: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>你做什么？</label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              >
                {["湘菜", "川菜", "火锅", "烧烤", "茶饮", "其他"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>你现在最想知道什么？</label>
              <div className="choices">
                {FOCI.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="choice"
                    data-on={form.focus === f}
                    onClick={() => setForm({ ...form, focus: f })}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !form.name.trim()}
                onClick={() => void startDiagnosis()}
              >
                开始认识我的店
              </button>
            </div>
          </div>
        </>
      )}

      {step === "working" && (
        <>
          <h1 className="brand">正在认识你的餐厅</h1>
          <p className="lede">不是空洞转圈——是在建立可核对的经营认知。</p>
          <div className="card">
            <ul className="checklist">
              {workLines.map((l, i) => (
                <li key={i}>
                  <span className={l.ok ? "mark-ok" : "mark-gap"}>
                    {l.ok ? "✓" : "!"}
                  </span>
                  <span>{l.text}</span>
                </li>
              ))}
            </ul>
            <p className="status">焦点：{form.focus}</p>
          </div>
        </>
      )}

      {step === "portrait" && result && ctx && (
        <>
          <h1 className="brand">我的餐厅经营画像</h1>
          <div className="strip">
            <span className="chip">
              {form.city}
              {form.district}
              {form.name}
            </span>
            <span className="chip">{form.category}</span>
            <span className="chip">观察完整度 ★★★☆☆</span>
            <span className="chip">更新：刚刚</span>
          </div>

          <div className="card">
            <p className="muted">一句话认识你</p>
            <p className="hero-line">{hero}</p>

            <h2 style={{ fontSize: "1.1rem", margin: "8px 0" }}>
              顾客正在这样谈论你
            </h2>
            <div className="wall">
              <div className="wall-col">
                <h3>顾客喜欢</h3>
                {likes.length ? (
                  likes.map((e) => (
                    <div key={e.id} className="quote">
                      「{e.claim}」
                      <div className="status">{e.source}</div>
                    </div>
                  ))
                ) : (
                  <p className="muted">暂无正向样本</p>
                )}
              </div>
              <div className="wall-col">
                <h3>顾客犹豫</h3>
                {hesitates.length ? (
                  hesitates.map((e) => (
                    <div key={e.id} className="quote">
                      「{e.claim}」
                      <div className="status">{e.source}</div>
                    </div>
                  ))
                ) : (
                  <p className="muted">暂无中性样本</p>
                )}
              </div>
              <div className="wall-col">
                <h3>顾客离开</h3>
                {leaves.length ? (
                  leaves.map((e) => (
                    <div key={e.id} className="quote">
                      「{e.claim}」
                      <div className="status">{e.source}</div>
                    </div>
                  ))
                ) : (
                  <p className="muted">暂无负向样本</p>
                )}
              </div>
            </div>

            {result.signals[0] && (
              <div className="diag">
                <h3>当前最大经营风险 · {result.signals[0].title}</h3>
                <p className="muted">为什么</p>
                <p>{result.signals[0].observation}</p>
                <p className="muted">可能原因（推断）</p>
                <p>{result.signals[0].pattern}</p>
                <p className="muted">影响</p>
                <p>{result.signals[0].impact}</p>
              </div>
            )}

            {result.gaps.length > 0 && (
              <>
                <p className="muted">下一步最值得验证</p>
                <ul className="checklist">
                  {result.gaps.map((g) => (
                    <li key={g.field}>
                      <span className="mark-gap">?</span>
                      <span>
                        {g.field}：{g.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="handoff">
              <p className="muted">同步与回跳（本页不拍板）</p>
              <p className="status">{syncNote}</p>
              <div className="actions">
                <a
                  className="btn btn-primary"
                  href={`${osBase}/dashboard`}
                  style={{ textDecoration: "none" }}
                >
                  回 MealKey 今日
                </a>
                <a
                  className="btn btn-ghost"
                  href={`${osBase}/dashboard`}
                  style={{ textDecoration: "none" }}
                >
                  需要拍板时进决策室
                </a>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setStep("onboarding");
                    setResult(null);
                    setWorkLines([]);
                  }}
                >
                  再诊断一家店
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
