"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  DeveloperShell,
  DocHeader,
} from "../../../../_components/developer-portal";

export default function AgentSubmitPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const router = useRouter();
  const [demoUrl, setDemoUrl] = useState("");
  const [privacyNotes, setPrivacyNotes] = useState("");
  const [priceModel, setPriceModel] = useState("free");
  const [priceMonthlyFen, setPriceMonthlyFen] = useState("29900");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [agentName, setAgentName] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/developers/agents/${id}`, { cache: "no-store" });
    const body = (await res.json()) as {
      ok?: boolean;
      agent?: {
        name: string;
        version?: { demoUrl?: string | null; privacyNotes?: string | null };
        lifecycleStatus?: string;
      };
    };
    if (res.status === 401) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/developers/console/agents/${id}/submit`)}`);
      return;
    }
    if (body.agent) {
      setAgentName(body.agent.name);
      setDemoUrl(body.agent.version?.demoUrl ?? "");
      setPrivacyNotes(body.agent.version?.privacyNotes ?? "");
      if (body.agent.lifecycleStatus === "submitted") setDone(true);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/developers/agents/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demoUrl,
          privacyNotes,
          pricing: {
            model: priceModel,
            priceMonthlyFen:
              priceModel === "subscription" ? Number(priceMonthlyFen) || 0 : undefined,
            currency: "CNY",
          },
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error || "提交失败");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeveloperShell activePath="/developers/console">
      <main className="mx-auto max-w-xl px-5 py-10 md:px-8">
        <DocHeader
          eyebrow="SUBMIT REVIEW"
          title={agentName ? `${agentName} · 提交审核` : "提交审核"}
          description="对齐 App Store 式 Checklist。通过后由平台运营审核，开发者侧进入「审核中」。"
          authority="UI/UX §6 · ReviewTask"
        />

        {done ? (
          <div className="rounded-[14px] border border-[rgba(102,115,94,0.22)] bg-[rgba(102,115,94,0.08)] px-4 py-5">
            <p className="font-semibold text-[#3d4a34]">已提交审核</p>
            <p className="mt-2 text-[14px] text-[#5f6368]">
              状态为「审核中」。可在上架预览页查看老板侧卡片草稿。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/developers/console/agents/${id}/listing`}
                className="inline-flex min-h-10 items-center rounded-[10px] bg-[#181817] px-4 text-[13px] font-semibold text-white"
              >
                上架预览
              </Link>
              <Link
                href="/developers/console"
                className="inline-flex min-h-10 items-center rounded-[10px] border border-[rgba(24,24,23,0.1)] bg-white px-4 text-[13px]"
              >
                返回 Console
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-1.5 text-[13px] text-[#5f6368]">
              <li>✓ Manifest</li>
              <li>✓ Security（密钥已签发）</li>
              <li>✓ Sandbox（须先 Run suite 通过）</li>
              <li>✓ Evidence 规则（契约层）</li>
              <li>□ UI Demo（下方填写）</li>
            </ul>

            <label className="block space-y-1.5">
              <span className="text-[12px] text-[#5f6368]">Demo URL / 录屏 *</span>
              <input
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px]"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[12px] text-[#5f6368]">隐私 / 数据说明 *</span>
              <textarea
                rows={4}
                value={privacyNotes}
                onChange={(e) => setPrivacyNotes(e.target.value)}
                className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px]"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[12px] text-[#5f6368]">定价模型</span>
              <select
                value={priceModel}
                onChange={(e) => setPriceModel(e.target.value)}
                className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px]"
              >
                <option value="free">免费</option>
                <option value="subscription">订阅</option>
                <option value="usage">按次</option>
              </select>
            </label>
            {priceModel === "subscription" ? (
              <label className="block space-y-1.5">
                <span className="text-[12px] text-[#5f6368]">月费（分）</span>
                <input
                  value={priceMonthlyFen}
                  onChange={(e) => setPriceMonthlyFen(e.target.value)}
                  className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px]"
                />
              </label>
            ) : null}

            {error ? <p className="text-[13px] text-[#8b3a2f]">{error}</p> : null}

            <button
              type="button"
              disabled={busy}
              onClick={() => void onSubmit()}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-[12px] bg-[#181817] text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? "提交中…" : "Submit"}
            </button>
          </div>
        )}
      </main>
    </DeveloperShell>
  );
}
