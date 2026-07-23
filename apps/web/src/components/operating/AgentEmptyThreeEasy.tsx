"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { BusinessAssetV1 } from "@/server/founder-layer/contracts/goal-compiler";

type ScenarioStart = {
  kind: "href";
  label: string;
  href: string;
};

/**
 * 对话空态 L1（三易 · 易学）
 * 一问候 + 一问 + 一主 CTA；场景网格收进「更多能力」
 */
export function AgentEmptyThreeEasy({
  greeting,
  ownerName,
  knownLine,
  primaryQuestion,
  busy,
  projectId,
  scenarioStarts,
  assets,
  aiSuggestion,
  observeUtterance,
  onStartTalk,
  onUpload,
  onDiagnose,
  onViewAsset,
  onContinueAsset,
  onObserve,
}: {
  greeting: string;
  ownerName?: string | null;
  knownLine?: string | null;
  primaryQuestion: string;
  busy: boolean;
  projectId: string;
  scenarioStarts: ScenarioStart[];
  assets: BusinessAssetV1[];
  aiSuggestion?: string | null;
  observeUtterance?: string | null;
  onStartTalk: () => void;
  onUpload: () => void;
  onDiagnose: () => void;
  onViewAsset: () => void;
  onContinueAsset: () => void;
  onObserve: () => void;
}) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="mx-auto flex min-h-[58dvh] max-w-3xl flex-col items-center justify-center px-5 text-center lg:min-h-[62dvh]">
      <p className="text-[11px] font-medium tracking-[0.16em] text-[#66735E]">
        易学 · 有事直接说
      </p>
      <h1 className="mt-4 font-display text-[30px] font-semibold leading-[1.15] tracking-[-0.045em] text-[#181817] lg:mt-5 lg:text-[36px]">
        {greeting}
        {ownerName ? `，${ownerName}` : ""}
      </h1>
      <p className="mt-5 max-w-[20em] text-[17px] font-medium leading-7 tracking-[-0.02em] text-[#202124] lg:max-w-[24em] lg:text-[19px]">
        {primaryQuestion}
      </p>
      {knownLine ? (
        <p className="mt-3 max-w-[22em] text-[12px] leading-5 text-[#4a5344]">
          已了解：{knownLine}
        </p>
      ) : (
        <p className="mt-3 max-w-[22em] text-[13px] leading-6 text-[#5c6168]">
          按住底部麦克风开口即可，不用填表。
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={onStartTalk}
        className="mt-7 inline-flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white shadow-[0_8px_22px_rgba(24,24,23,0.14)] transition active:scale-[0.98] disabled:opacity-50"
      >
        <MessageCircle className="h-4 w-4" />
        开口说经营
      </button>

      <nav
        aria-label="三易捷径"
        className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
      >
        <Link
          href={`/projects/${projectId}/decision-room?intake=voice`}
          prefetch={false}
          className="text-[13px] font-medium text-[#66735E] no-underline underline-offset-2 hover:underline"
        >
          易做 · 去拍板
        </Link>
        <Link
          href={`/projects/${projectId}/decisions`}
          prefetch={false}
          className="text-[13px] font-medium text-[#66735E] no-underline underline-offset-2 hover:underline"
        >
          易管 · 去跟进
        </Link>
        <Link
          href="/dashboard?radar=1"
          prefetch={false}
          className="text-[13px] font-medium text-[#66735E] no-underline underline-offset-2 hover:underline"
        >
          经营动态
        </Link>
      </nav>

      {aiSuggestion && observeUtterance ? (
        <button
          type="button"
          disabled={busy}
          onClick={onObserve}
          className="mt-6 max-w-[min(100%,20rem)] rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-2.5 text-left text-[13px] leading-5 text-[#3a3a38] disabled:opacity-50"
        >
          <span className="text-[#8a8680]">经营动态 · </span>
          {aiSuggestion}
        </button>
      ) : null}

      <div className="mt-6 w-full max-w-lg">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="text-[13px] font-medium text-[#66735E] underline-offset-2 hover:underline"
        >
          {showMore ? "收起更多能力" : "更多能力"}
        </button>
        {showMore ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {scenarioStarts.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center justify-center rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-3 text-[13px] font-medium text-[#181817] no-underline transition active:scale-[0.98] hover:bg-[#FBFAF7]"
                >
                  {s.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px]">
              <button
                type="button"
                disabled={busy}
                onClick={onUpload}
                className="font-medium text-[#66735E] underline-offset-2 hover:underline disabled:opacity-50"
              >
                上传经营资料
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onDiagnose}
                className="font-medium text-[#66735E] underline-offset-2 hover:underline disabled:opacity-50"
              >
                对话里做体检
              </button>
              {assets[0] ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onViewAsset}
                    className="font-medium text-[#66735E] underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    继续上次资产
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onContinueAsset}
                    className="font-medium text-[#66735E] underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    就上次结果继续聊
                  </button>
                </>
              ) : null}
              <Link
                href={`/projects/${projectId}/capability`}
                prefetch={false}
                className="font-medium text-[#66735E] no-underline underline-offset-2 hover:underline"
              >
                能力一览
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
