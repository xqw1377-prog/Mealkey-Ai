"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Pencil, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PageContent } from "@/components/operating/PageContent";
import { PageErrorBoundary } from "@/components/operating/PageErrorBoundary";
import { PageLoadingState } from "@/components/operating/PageState";
import { MKBrand } from "@/components/brand/MKBrand";
import type { RestaurantIntelligenceSnapshotV1 } from "@/server/founder-layer/contracts/restaurant-intelligence-profile";

type ViewPhase = "recognizing" | "portrait" | "revise";

export default function RestaurantIntelligencePage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <PageErrorBoundary fallbackTitle="经营画像暂时无法打开">
      <RestaurantIntelligenceFlow projectId={params.projectId} />
    </PageErrorBoundary>
  );
}

function RestaurantIntelligenceFlow({ projectId }: { projectId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch } =
    trpc.restaurantIntelligence.get.useQuery({ projectId });

  const generate = trpc.restaurantIntelligence.generate.useMutation({
    onSuccess: async () => {
      await refetch();
    },
  });
  const confirm = trpc.restaurantIntelligence.confirm.useMutation({
    onSuccess: async (payload) => {
      await utils.dashboard.getHome.invalidate();
      await utils.restaurantIntelligence.get.invalidate({ projectId });
      if (payload.redirectTo === "/dashboard") {
        router.replace("/dashboard");
      } else {
        setPhase("portrait");
        setShowRevise(false);
        await refetch();
      }
    },
  });

  const [phase, setPhase] = useState<ViewPhase>("recognizing");
  const [showRevise, setShowRevise] = useState(false);
  const [stageLabel, setStageLabel] = useState("");
  const [category, setCategory] = useState("");
  const [founderClaim, setFounderClaim] = useState("");
  const [recognizingDone, setRecognizingDone] = useState(false);
  const generateAttempted = useRef(false);

  const snapshot = data?.snapshot ?? null;

  useEffect(() => {
    if (isLoading || snapshot || generateAttempted.current) return;
    generateAttempted.current = true;
    generate.mutate({ projectId });
  }, [isLoading, snapshot, projectId, generate]);

  useEffect(() => {
    if (!snapshot) return;
    setStageLabel(snapshot.basic.stageLabel || "");
    setCategory(snapshot.basic.category || "");
    setFounderClaim(snapshot.cognitionGap?.founderClaim || "");
  }, [snapshot?.snapshotId]);

  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.status === "confirmed") {
      router.replace("/dashboard");
      return;
    }
    const timer = window.setTimeout(() => {
      setRecognizingDone(true);
      setPhase("portrait");
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [snapshot?.snapshotId, snapshot?.status, router]);

  const collectionSteps = useMemo(() => {
    const c = snapshot?.collection;
    return [
      { label: "基础信息", done: Boolean(c?.identityReady) },
      { label: "网络评价分析", done: Boolean(c?.reviewIntelReady) },
      { label: "用户反馈分析", done: Boolean(c?.feedbackIntelReady) },
      { label: "市场环境扫描", done: Boolean(c?.marketScanReady) },
    ];
  }, [snapshot]);

  if (isLoading && !snapshot) {
    return (
      <PageLoadingState
        eyebrow="经营认知"
        title="正在认识你的生意…"
        description="先整理你提供的经营身份，再生成第一版画像。"
        steps={[
          { label: "读取经营身份", status: "done" },
          { label: "建立理解草稿", status: "active" },
          { label: "生成经营画像", status: "pending" },
        ]}
      />
    );
  }

  if (error && !snapshot) {
    return (
      <PageContent>
        <div className="mx-auto max-w-xl space-y-4 px-4 py-10">
          <p className="text-[11px] tracking-[0.14em] text-[#66735E]">经营认知</p>
          <h1 className="font-display text-[30px] font-semibold text-[#202124]">
            画像暂时打不开
          </h1>
          <p className="text-[15px] text-[#3a3d41]">{error.message}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => generate.mutate({ projectId, force: true })}
          >
            重新生成
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-5 text-[15px] font-semibold text-[#181817]"
            onClick={() => router.replace("/dashboard")}
          >
            先进入驾驶舱
          </button>
        </div>
      </PageContent>
    );
  }

  if (!snapshot || phase === "recognizing" || !recognizingDone) {
    return (
      <PageContent>
        <RecognizingScreen
          steps={collectionSteps}
          notes={snapshot?.collection.degradedNotes}
          onSkip={() => router.replace("/dashboard")}
          generating={generate.isPending || !snapshot}
        />
      </PageContent>
    );
  }

  return (
    <PageContent>
      <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-16 pt-6 md:px-6">
        <header className="space-y-3">
          <MKBrand subtitle={null} />
          <p className="text-[11px] font-medium tracking-[0.14em] text-[#66735E]">
            建立你的经营认知
          </p>
          <h1 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.045em] text-[#202124] md:text-[36px]">
            {snapshot.basic.brandName}经营画像 {snapshot.versionLabel}
          </h1>
          <p className="text-[15px] leading-7 text-[#3a3d41]">
            这是我对你的第一理解。确认前不会当作最终事实写入。
          </p>
        </header>

        <PortraitCard snapshot={snapshot} />

        {showRevise ? (
          <section className="space-y-4 border-y border-[rgba(24,24,23,0.08)] py-5">
            <p className="text-[13px] text-[#66735E]">修改后仍需再确认一次</p>
            <label className="block space-y-1.5">
              <span className="text-[11px] tracking-[0.12em] text-[#66735E]">
                经营阶段
              </span>
              <input
                value={stageLabel}
                onChange={(e) => setStageLabel(e.target.value)}
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#66735E]"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] tracking-[0.12em] text-[#66735E]">
                品类
              </span>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#66735E]"
                placeholder="例如：湘菜 / 社区简餐"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] tracking-[0.12em] text-[#66735E]">
                你认为自己的优势（可选）
              </span>
              <input
                value={founderClaim}
                onChange={(e) => setFounderClaim(e.target.value)}
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#66735E]"
                placeholder="例如：菜品品质"
              />
            </label>
            <button
              type="button"
              disabled={confirm.isPending}
              onClick={() =>
                confirm.mutate({
                  projectId,
                  snapshotId: snapshot.snapshotId,
                  action: "revise",
                  revise: {
                    stageLabel: stageLabel.trim() || undefined,
                    category: category.trim() || undefined,
                    founderClaim: founderClaim.trim() || undefined,
                  },
                })
              }
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white"
            >
              保存修改
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        ) : (
          <section className="space-y-3">
            <p className="text-[15px] font-medium text-[#202124]">
              这是我对你的第一理解，准确吗？
            </p>
            <div className="space-y-2 rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3">
              <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
                你认为自己的优势（可选 · 写入经营决策习惯）
              </p>
              <div className="flex flex-wrap gap-2">
                {["菜品品质", "性价比", "服务", "环境", "聚餐氛围"].map(
                  (chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setFounderClaim(chip)}
                      className={`min-h-10 rounded-[12px] px-3 text-[13px] ${
                        founderClaim === chip
                          ? "bg-[#181817] text-white"
                          : "border border-[rgba(24,24,23,0.12)] bg-white text-[#202124]"
                      }`}
                    >
                      {chip}
                    </button>
                  ),
                )}
              </div>
              <input
                value={founderClaim}
                onChange={(e) => setFounderClaim(e.target.value)}
                placeholder="或自己写一句"
                className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-[#66735E]"
              />
            </div>
            <button
              type="button"
              disabled={confirm.isPending}
              onClick={() =>
                confirm.mutate({
                  projectId,
                  snapshotId: snapshot.snapshotId,
                  action: "confirm",
                  founderClaim: founderClaim.trim() || undefined,
                })
              }
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white"
            >
              基本准确，进入驾驶舱
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={confirm.isPending}
              onClick={() => setShowRevise(true)}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-5 text-[15px] font-semibold text-[#181817]"
            >
              修改
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={confirm.isPending}
              onClick={() =>
                confirm.mutate({
                  projectId,
                  snapshotId: snapshot.snapshotId,
                  action: "reject",
                })
              }
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-transparent px-5 text-[15px] font-medium text-[#6f747b]"
            >
              不符合，先进入驾驶舱
              <X className="h-4 w-4" />
            </button>
          </section>
        )}

        {confirm.error ? (
          <p className="text-[13px] text-[#8A4F31]">{confirm.error.message}</p>
        ) : null}
      </div>
    </PageContent>
  );
}

function RecognizingScreen({
  steps,
  notes,
  onSkip,
  generating,
}: {
  steps: Array<{ label: string; done: boolean; skipped?: boolean }>;
  notes?: string[];
  onSkip?: () => void;
  generating?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-16 pt-8 md:px-6">
      <MKBrand subtitle={null} />
      <div className="space-y-2">
        <p className="text-[11px] font-medium tracking-[0.14em] text-[#66735E]">
          餐启 · MealKey
        </p>
        <h1 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.045em] text-[#202124] md:text-[36px]">
          正在认识你的生意…
        </h1>
        <p className="text-[15px] leading-7 text-[#3a3d41]">
          先建立第一版经营理解。外部证据未就绪时会明示降级，不会打假勾。
        </p>
      </div>

      <ul className="space-y-3 border-y border-[rgba(24,24,23,0.08)] py-5">
        {steps.map((step) => (
          <li
            key={step.label}
            className="flex items-center justify-between gap-3 text-[15px]"
          >
            <span className="text-[#202124]">{step.label}</span>
            <span
              className={
                step.done
                  ? "text-[#66735E]"
                  : "text-[#6f747b]"
              }
            >
              {step.done ? "已完成" : "未接入 · 已降级"}
            </span>
          </li>
        ))}
      </ul>

      {notes && notes.length > 0 ? (
        <div className="space-y-1">
          {notes.map((note) => (
            <p key={note} className="text-[13px] leading-6 text-[#B47C5C]">
              {note}
            </p>
          ))}
        </div>
      ) : null}

      <p className="text-[13px] text-[#66735E]">
        {generating ? "正在生成你的经营画像…" : "即将展示画像…"}
      </p>
      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          className="text-[13px] font-medium text-[#6f747b] underline-offset-2 hover:underline"
        >
          先进入驾驶舱
        </button>
      ) : null}
    </div>
  );
}

function PortraitCard({
  snapshot,
}: {
  snapshot: RestaurantIntelligenceSnapshotV1;
}) {
  const location = [snapshot.basic.city, snapshot.basic.districtOrArea]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="space-y-5 rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white p-5">
      <div>
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">一、基础身份</p>
        <dl className="mt-3 space-y-2 text-[15px] text-[#202124]">
          <div className="flex justify-between gap-3">
            <dt className="text-[#6f747b]">品牌</dt>
            <dd>{snapshot.basic.brandName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6f747b]">品类</dt>
            <dd>{snapshot.basic.category || "待确认"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6f747b]">位置</dt>
            <dd>{location || "待补"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6f747b]">阶段</dt>
            <dd>{snapshot.basic.stageLabel || "待确认"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6f747b]">客单</dt>
            <dd>{snapshot.basic.avgTicketHint || "未知"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6f747b]">竞争</dt>
            <dd className="text-right">{snapshot.basic.competitionHint || "未知"}</dd>
          </div>
        </dl>
      </div>

      <div>
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
          二、顾客怎么看你
        </p>
        {snapshot.customer.evidenceInsufficient ? (
          <p className="mt-3 text-[15px] leading-7 text-[#6f747b]">
            尚未形成可靠的顾客认知（缺锚点或外部采集未就绪）
          </p>
        ) : (
          <div className="mt-3 space-y-3 text-[15px] text-[#202124]">
            {snapshot.customer.aspectScores.length > 0 ? (
              <ul className="space-y-1.5">
                {snapshot.customer.aspectScores.map((a) => (
                  <li
                    key={a.aspect}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-[#6f747b]">{a.label}</span>
                    <span>
                      {typeof a.score === "number" ? `${a.score}` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {snapshot.customer.positiveKeywords.length > 0 ? (
              <p>
                <span className="text-[#6f747b]">正向 · </span>
                {snapshot.customer.positiveKeywords.join("、")}
              </p>
            ) : null}
            {snapshot.customer.watchouts.length > 0 ? (
              <p>
                <span className="text-[#B47C5C]">需关注 · </span>
                {snapshot.customer.watchouts.join("、")}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div>
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
          三、老板认知 vs 顾客认知
        </p>
        {snapshot.cognitionGap ? (
          <div className="mt-3 space-y-2 text-[15px] leading-7 text-[#202124]">
            <p>你认为：{snapshot.cognitionGap.founderClaim}</p>
            <p className="text-[#6f747b]">↓</p>
            <p>顾客感知：{snapshot.cognitionGap.customerPerception}</p>
            <p className="text-[13px] text-[#6f747b]">
              {snapshot.cognitionGap.summaryLine}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-[15px] leading-7 text-[#6f747b]">
            确认前可补充你认为的优势；有顾客证据时会对照差距，写入经营决策习惯（不是性格测评）。
          </p>
        )}
      </div>

      <div>
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
          四、系统当下判断
        </p>
        <ul className="mt-3 space-y-2">
          {snapshot.alerts.map((a) => (
            <li key={a.line} className="text-[15px] leading-7 text-[#202124]">
              · {a.line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
