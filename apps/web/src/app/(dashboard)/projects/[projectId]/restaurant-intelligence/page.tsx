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
        setShowRevise(payload.snapshot.status === "rejected");
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
  const identity = data?.identity ?? null;

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
    }, 1600);
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
        description="先整理你提供的经营身份，再自动补充外部信息。"
        steps={[
          { label: "读取经营身份", status: "done" },
          { label: "采集外部线索", status: "active" },
          { label: "生成经营认知档案", status: "pending" },
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
          generating={generate.isPending || !snapshot}
        />
      </PageContent>
    );
  }

  const ownerLabel = identity?.objectName
    ? `${identity.objectName.replace(/店$/, "")}老板`
    : "老板";

  return (
    <PageContent>
      <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-16 pt-6 md:px-6">
        <header className="space-y-3">
          <MKBrand subtitle={null} />
          <p className="text-[11px] font-medium tracking-[0.14em] text-[#66735E]">
            餐启 · 经营认知档案
          </p>
          <h1 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.045em] text-[#202124] md:text-[36px]">
            {snapshot.basic.brandName}经营画像 {snapshot.versionLabel}
          </h1>
          <p className="text-[15px] leading-7 text-[#3a3d41]">
            {ownerLabel}，这是我目前对你这家生意的理解。请确认，这是不是你正在经营的世界。
          </p>
        </header>

        <TrustLegend
          reviewReady={snapshot.collection.reviewIntelReady}
          evidenceInsufficient={snapshot.customer.evidenceInsufficient}
        />

        <PortraitCard snapshot={snapshot} />

        {snapshot.status === "rejected" ? (
          <p className="rounded-[12px] border border-[rgba(180,124,92,0.35)] bg-[#FBF6F2] px-4 py-3 text-[14px] leading-6 text-[#8A4F31]">
            你标记为不符合。请修改后再次确认——确认前不会进入驾驶舱，也不会把错误理解写入 Brain。
          </p>
        ) : null}

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
              确认档案 · 准确吗？
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
              确认档案，进入驾驶舱
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={confirm.isPending}
              onClick={() => setShowRevise(true)}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-5 text-[15px] font-semibold text-[#181817]"
            >
              继续完善
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
              不符合，我来改
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

function TrustLegend({
  reviewReady,
  evidenceInsufficient,
}: {
  reviewReady: boolean;
  evidenceInsufficient: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3 py-3 text-center">
      <div>
        <p className="text-[11px] tracking-[0.08em] text-[#66735E]">你告诉我</p>
        <p className="mt-1 text-[13px] font-semibold text-[#202124]">★★★★★</p>
      </div>
      <div>
        <p className="text-[11px] tracking-[0.08em] text-[#66735E]">我观察到的</p>
        <p className="mt-1 text-[13px] font-semibold text-[#202124]">
          {reviewReady && !evidenceInsufficient ? "★★★★☆" : "★★☆☆☆"}
        </p>
      </div>
      <div>
        <p className="text-[11px] tracking-[0.08em] text-[#66735E]">我推断的</p>
        <p className="mt-1 text-[13px] font-semibold text-[#202124]">★★★☆☆</p>
      </div>
    </div>
  );
}

function RecognizingScreen({
  steps,
  notes,
  generating,
}: {
  steps: Array<{ label: string; done: boolean }>;
  notes?: string[];
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
          不是在收集资料，而是在建立你的经营认知档案。外部证据未就绪时会明示降级，不会打假勾。
        </p>
      </div>

      <ul className="space-y-3 border-y border-[rgba(24,24,23,0.08)] py-5">
        {steps.map((step) => (
          <li
            key={step.label}
            className="flex items-center justify-between gap-3 text-[15px]"
          >
            <span className="text-[#202124]">{step.label}</span>
            <span className={step.done ? "text-[#66735E]" : "text-[#6f747b]"}>
              {step.done ? "✓ 已完成" : "⚠ 未接入 · 已降级"}
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
        {generating ? "正在生成你的经营认知档案…" : "即将展示档案…"}
      </p>
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

  const knownStrengths = [
    snapshot.cognitionGap?.founderClaim,
    snapshot.basic.category ? `品类清晰：${snapshot.basic.category}` : null,
    snapshot.collection.identityReady ? "经营身份已锚定" : null,
  ].filter(Boolean) as string[];

  const unknowns = [
    !snapshot.basic.avgTicketHint || snapshot.basic.avgTicketHint === "未知"
      ? "当前真实客单 / 盈利模型"
      : null,
    snapshot.customer.evidenceInsufficient ? "用户复购结构" : null,
    /扩张|复制|第二/.test(snapshot.basic.stageLabel || "")
      ? "店长复制能力"
      : null,
  ].filter(Boolean) as string[];

  const marketEvidence = snapshot.evidence.filter((e) => e.source !== "经营身份");

  return (
    <section className="space-y-5 rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white p-5">
      <div>
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
          【经营主体】· 你告诉我
        </p>
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
            <dt className="text-[#6f747b]">所在地</dt>
            <dd>{location || "待补"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6f747b]">阶段</dt>
            <dd>{snapshot.basic.stageLabel || "待确认"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6f747b]">竞争</dt>
            <dd className="text-right">
              {snapshot.basic.competitionHint || "未知"}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
          【我了解到的经营事实】
        </p>
        <div className="mt-3 space-y-3 text-[15px] leading-7 text-[#202124]">
          {knownStrengths.length > 0 ? (
            <div>
              <p className="text-[13px] text-[#66735E]">优势 / 已知</p>
              <ul className="mt-1 space-y-1">
                {knownStrengths.map((s) => (
                  <li key={s}>✓ {s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {unknowns.length > 0 ? (
            <div>
              <p className="text-[13px] text-[#B47C5C]">未知 · 决策前须补</p>
              <ul className="mt-1 space-y-1 text-[#8A4F31]">
                {unknowns.map((u) => (
                  <li key={u}>⚠ {u}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
          【市场正在怎么看你】· 我观察到的
        </p>
        {snapshot.customer.evidenceInsufficient ? (
          <p className="mt-3 text-[15px] leading-7 text-[#6f747b]">
            尚未形成可靠的顾客认知（缺锚点或外部采集未就绪）。不会假装已完成网络评价分析。
          </p>
        ) : (
          <div className="mt-3 space-y-3 text-[15px] text-[#202124]">
            {snapshot.customer.positiveKeywords.length > 0 ? (
              <p>
                <span className="text-[#66735E]">好评集中 · </span>
                {snapshot.customer.positiveKeywords.join("、")}
              </p>
            ) : null}
            {snapshot.customer.watchouts.length > 0 ? (
              <p>
                <span className="text-[#B47C5C]">差评 / 需关注 · </span>
                {snapshot.customer.watchouts.join("、")}
              </p>
            ) : null}
            {marketEvidence.length > 0 ? (
              <ul className="space-y-2 border-t border-[rgba(24,24,23,0.06)] pt-3 text-[13px] leading-6 text-[#3a3d41]">
                {marketEvidence.slice(0, 3).map((e) => (
                  <li key={e.id}>
                    <span className="text-[#66735E]">{e.source}</span>
                    {" · "}
                    {e.content.slice(0, 90)}
                    {e.content.length > 90 ? "…" : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>

      {snapshot.cognitionGap ? (
        <div>
          <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
            【老板 vs 顾客】
          </p>
          <div className="mt-3 space-y-2 text-[15px] leading-7 text-[#202124]">
            <p>你认为：{snapshot.cognitionGap.founderClaim}</p>
            <p className="text-[#6f747b]">↓</p>
            <p>顾客感知：{snapshot.cognitionGap.customerPerception}</p>
            <p className="text-[13px] text-[#6f747b]">
              {snapshot.cognitionGap.summaryLine}
            </p>
          </div>
        </div>
      ) : null}

      <div>
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
          【我的初步判断】· 系统推断
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
