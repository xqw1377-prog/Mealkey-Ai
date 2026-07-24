"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { MKPageHeader } from "@/components/operating/MKPageHeader";
import { OpsSecondaryLinks } from "@/components/operating/OpsSecondaryLinks";
import { PageContent } from "@/components/operating/PageContent";
import { PageErrorBoundary } from "@/components/operating/PageErrorBoundary";
import {
  FOCUS_LABEL,
  HORIZON_LABEL,
  SCOPE_LABEL,
  type BusinessScopeKind,
  type DecisionFocusKind,
  type DecisionHorizonV1,
} from "@/server/founder-layer/contracts/business-identity";

const fieldClass =
  "w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] text-[#202124] outline-none focus:border-[#66735E]";

const labelClass = "text-[11px] tracking-[0.12em] text-[#66735E]";

export default function BusinessIdentityPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <PageErrorBoundary fallbackTitle="经营身份暂时无法打开">
      <BusinessIdentityForm projectId={params.projectId} />
    </PageErrorBoundary>
  );
}

function BusinessIdentityForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: project, isLoading } = trpc.project.getById.useQuery({
    id: projectId,
  });
  const generateRip = trpc.restaurantIntelligence.generate.useMutation();
  const save = trpc.project.saveBusinessIdentity.useMutation({
    onSuccess: async () => {
      await utils.dashboard.getHome.invalidate();
      try {
        await generateRip.mutateAsync({ projectId, force: true });
        router.push(`/projects/${projectId}/restaurant-intelligence`);
      } catch {
        router.push("/dashboard");
      }
    },
  });

  const [objectName, setObjectName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [location, setLocation] = useState("");
  const [scope, setScope] = useState<BusinessScopeKind>("store");
  const [band, setBand] = useState<"1" | "2-5" | "5+">("1");
  const [focus, setFocus] = useState<DecisionFocusKind>("growth");
  const [horizon, setHorizon] = useState<DecisionHorizonV1>("mid");
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!project) return;
    const profile = (project.profile || {}) as Record<string, unknown>;
    const bi =
      profile.businessIdentity && typeof profile.businessIdentity === "object"
        ? (profile.businessIdentity as Record<string, unknown>)
        : null;
    setObjectName(String(bi?.objectName || project.name || ""));
    setBrandName(
      String(bi?.brandName || profile.brandName || project.name || ""),
    );
    const loc = [bi?.city || project.city, bi?.district || project.district]
      .filter(Boolean)
      .join(" · ");
    setLocation(String(bi?.address || loc || ""));
    if (
      bi?.scope === "store" ||
      bi?.scope === "brand" ||
      bi?.scope === "multi_brand" ||
      bi?.scope === "region"
    ) {
      setScope(bi.scope);
    }
    if (bi?.storeCountBand === "2-5" || bi?.storeCountBand === "5+") {
      setBand(bi.storeCountBand);
    } else if (bi?.storeCountBand === "1") {
      setBand("1");
    }
    if (
      bi?.focus === "growth" ||
      bi?.focus === "profit" ||
      bi?.focus === "org" ||
      bi?.focus === "product" ||
      bi?.focus === "expansion"
    ) {
      setFocus(bi.focus);
    }
    if (
      bi?.decisionHorizon === "short" ||
      bi?.decisionHorizon === "mid" ||
      bi?.decisionHorizon === "long"
    ) {
      setHorizon(bi.decisionHorizon);
    }
    setProblem(String(bi?.biggestProblem || ""));
  }, [project]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate({
      projectId,
      objectName,
      brandName,
      location,
      scope,
      storeCountBand: band,
      focus,
      decisionHorizon: horizon,
      biggestProblem: problem || undefined,
    });
  }

  return (
    <PageContent width="narrow" inset="shell" className="space-y-6">
      <MKPageHeader
        eyebrow="经营身份"
        title="你希望我帮你经营哪一家生意？"
        description="品牌与地理是必填——否则无法把外部信息变成你的决策证据。"
        meta={
          <OpsSecondaryLinks
            projectId={projectId}
            links={[
              { href: "/dashboard?radar=1", label: "经营动态" },
              { href: `/projects/${projectId}/agent`, label: "回对话" },
              {
                href: `/projects/${projectId}/decision-room`,
                label: "去拍板",
              },
              {
                href: `/projects/${projectId}/restaurant-intelligence`,
                label: "经营画像",
              },
            ]}
          />
        }
      />

      {isLoading ? (
        <p className="text-[14px] text-[#6f747b]">加载中…</p>
      ) : (
        <form className="space-y-5" onSubmit={onSubmit}>
          <label className="block space-y-2">
            <span className={labelClass}>经营对象名称</span>
            <input
              required
              value={objectName}
              onChange={(e) => setObjectName(e.target.value)}
              className={fieldClass}
              placeholder="南门小馆"
            />
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>品牌名称</span>
            <input
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className={fieldClass}
              placeholder="最湘宴"
            />
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>城市 / 区域 / 门店地址</span>
            <input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={fieldClass}
              placeholder="长沙 · 岳麓区"
            />
          </label>

          <div className="space-y-2">
            <p className={labelClass}>经营范围</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SCOPE_LABEL) as BusinessScopeKind[]).map((k) => (
                <Choice
                  key={k}
                  active={scope === k}
                  onClick={() => setScope(k)}
                  label={SCOPE_LABEL[k]}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className={labelClass}>规模</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["1", "1 家"],
                  ["2-5", "2–5 家"],
                  ["5+", "5 家以上"],
                ] as const
              ).map(([v, label]) => (
                <Choice
                  key={v}
                  active={band === v}
                  onClick={() => setBand(v)}
                  label={label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className={labelClass}>最关注</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(FOCUS_LABEL) as DecisionFocusKind[]).map((k) => (
                <Choice
                  key={k}
                  active={focus === k}
                  onClick={() => setFocus(k)}
                  label={FOCUS_LABEL[k]}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className={labelClass}>决策时间尺度</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(Object.keys(HORIZON_LABEL) as DecisionHorizonV1[]).map((k) => (
                <Choice
                  key={k}
                  active={horizon === k}
                  onClick={() => setHorizon(k)}
                  label={HORIZON_LABEL[k]}
                />
              ))}
            </div>
          </div>

          <label className="block space-y-2">
            <span className={labelClass}>现在最困扰的事（可选）</span>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="例如：要不要开第二家"
            />
          </label>

          {save.error ? (
            <p className="text-[13px] text-[#B47C5C]">{save.error.message}</p>
          ) : null}

          <button
            type="submit"
            disabled={save.isPending}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white touch-manipulation active:scale-[0.98] disabled:opacity-60"
          >
            {save.isPending ? "保存中…" : "保存并回驾驶舱"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}
    </PageContent>
  );
}

function Choice({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-[12px] border px-3 text-[14px] touch-manipulation active:scale-[0.98] ${
        active
          ? "border-[#181817] bg-[#181817] text-white"
          : "border-[rgba(24,24,23,0.12)] bg-[#FBFAF7] text-[#202124]"
      }`}
    >
      {label}
    </button>
  );
}
