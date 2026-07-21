"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  DeveloperShell,
  DocHeader,
  DocSection,
} from "../_components/developer-portal";

type ApplyType = "individual" | "company" | "partner_org";

export default function DevelopersApplyPage() {
  const [type, setType] = useState<ApplyType>("company");
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [direction, setDirection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; message: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/developers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          displayName: displayName.trim(),
          legalName: legalName.trim() || undefined,
          website: website.trim() || undefined,
          contactEmail: contactEmail.trim(),
          direction: direction.trim(),
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        id?: string;
        message?: string;
      } | null;
      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent("/developers/apply")}`;
        return;
      }
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "提交失败");
      }
      setDone({
        id: body.id ?? "",
        message: body.message ?? "申请已收到",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeveloperShell activePath="/developers/apply">
      <main className="mx-auto max-w-xl px-5 py-10 md:px-8">
        <DocHeader
          eyebrow="APPLY"
          title="开发者入驻申请"
          description="约 10 分钟。通过后可创建 Agent（P1 Console）。管理员审核在平台运营台。"
          authority="MEALKEY_DEVELOPER_PORTAL_IA_DATA_MODEL_V1 · DeveloperAccount"
        />

        {done ? (
          <div className="rounded-[14px] border border-[rgba(102,115,94,0.25)] bg-[rgba(102,115,94,0.08)] px-4 py-5">
            <p className="text-[15px] font-semibold text-[#3d4a34]">申请已提交</p>
            <p className="mt-2 text-[14px] leading-6 text-[#5f6368]">{done.message}</p>
            {done.id ? (
              <p className="mt-2 text-[12px] text-[#8a8f98]">单号 {done.id}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/developers/start"
                className="inline-flex min-h-10 items-center gap-1 rounded-[10px] bg-[#181817] px-4 text-[13px] font-semibold text-white"
              >
                继续 Quick Start
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/developers/docs"
                className="inline-flex min-h-10 items-center rounded-[10px] border border-[rgba(24,24,23,0.1)] bg-white px-4 text-[13px] font-medium text-[#202124]"
              >
                读文档
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <DocSection title="主体类型">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["individual", "个人开发者"],
                    ["company", "企业开发者"],
                    ["partner_org", "合作机构"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={`rounded-[10px] px-3 py-2 text-[13px] font-medium ${
                      type === key
                        ? "bg-[#181817] text-white"
                        : "border border-[rgba(24,24,23,0.1)] bg-white text-[#5f6368]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </DocSection>

            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-[#5f6368]">展示名称 *</span>
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#66735E]"
                placeholder="团队或产品名"
              />
            </label>

            {type !== "individual" ? (
              <label className="block space-y-1.5">
                <span className="text-[12px] font-medium text-[#5f6368]">企业全称</span>
                <input
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#66735E]"
                />
              </label>
            ) : null}

            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-[#5f6368]">联系邮箱 *</span>
              <input
                required
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#66735E]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-[#5f6368]">官网</span>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#66735E]"
                placeholder="https://"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-[#5f6368]">产品方向 *</span>
              <textarea
                required
                rows={4}
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#66735E]"
                placeholder="例如：排班优化 / 采购预测 / 菜品分析 Agent"
              />
            </label>

            {error ? (
              <p className="rounded-[10px] bg-[rgba(180,60,40,0.08)] px-3 py-2 text-[13px] text-[#8b3a2f]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-[12px] bg-[#181817] text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? "提交中…" : "提交申请"}
            </button>
          </form>
        )}
      </main>
    </DeveloperShell>
  );
}
