"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { MKBrand } from "@/components/brand/MKBrand";

/**
 * 忘记密码：写入重置票；生产由管理员签发链接，开发可直接拿到 resetUrl。
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    setDevResetUrl(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        resetUrl?: string;
      };
      if (!res.ok) {
        setError(body.error || "申请失败，请稍后重试");
        return;
      }
      if (body.resetUrl) setDevResetUrl(body.resetUrl);
      setSubmitted(true);
    } catch {
      setError("网络不稳，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F3ED] px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <MKBrand />
          </div>
          <h1 className="mt-6 text-[24px] font-semibold tracking-[-0.04em] text-[#171717]">
            重置密码
          </h1>
          <p className="mt-2 text-[14px] text-[#6c685f]">用注册邮箱申请</p>
        </div>

        <div className="card p-6">
          {submitted ? (
            <div className="space-y-4 text-[14px] leading-7 text-[#5f5b54]">
              <p>
                若邮箱 <span className="font-medium text-[#171717]">{email}</span>{" "}
                已注册，请联系平台管理员协助签发重置链接（当前未接自动邮件）。
              </p>
              {devResetUrl ? (
                <div className="rounded-[12px] border border-[rgba(102,115,94,0.3)] bg-[rgba(102,115,94,0.08)] px-3 py-2.5 text-[12px] leading-5 text-[#3d4a36]">
                  <p className="font-semibold">开发环境重置链接（1 小时有效）</p>
                  <a
                    href={devResetUrl}
                    className="mt-1 block break-all underline"
                  >
                    {devResetUrl}
                  </a>
                </div>
              ) : null}
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center bg-[#181817] px-5 text-[14px] font-semibold text-white no-underline"
              >
                返回登录
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-[#3d392f]">
                  注册邮箱
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#66735E]"
                  placeholder="请输入注册邮箱"
                />
              </label>
              {error ? (
                <p className="text-[13px] text-[#8A4F31]">{error}</p>
              ) : null}
              <button
                type="submit"
                disabled={pending}
                className="btn-primary w-full justify-center disabled:opacity-50"
              >
                {pending ? "提交中…" : "申请重置"}
              </button>
              <p className="text-center text-[13px] text-[#6c685f]">
                <Link
                  href="/login"
                  className="font-medium text-[#171717] underline-offset-4 hover:underline"
                >
                  返回登录
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
