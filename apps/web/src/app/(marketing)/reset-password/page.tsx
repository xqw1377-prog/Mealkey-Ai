"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MKBrand } from "@/components/brand/MKBrand";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(
    () => searchParams?.get("token")?.trim() || "",
    [searchParams],
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError("重置链接无效，请重新申请");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error || "重置失败");
        return;
      }
      setDone(true);
      window.setTimeout(() => router.replace("/login"), 1200);
    } catch {
      setError("网络不稳，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card p-6">
      {done ? (
        <div className="space-y-3 text-[14px] leading-7 text-[#5f5b54]">
          <p className="font-medium text-[#171717]">密码已更新</p>
          <p>正在跳转登录页…</p>
          <Link href="/login" className="underline">
            立即登录
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          {!token ? (
            <p className="text-[13px] text-[#8A4F31]">
              缺少重置令牌。请从管理员发给你的链接进入，或回忘记密码页重新申请。
            </p>
          ) : null}
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-[#3d392f]">
              新密码
            </span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#66735E]"
              placeholder="至少 8 位，含字母和数字"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-[#3d392f]">
              确认新密码
            </span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#66735E]"
            />
          </label>
          {error ? <p className="text-[13px] text-[#8A4F31]">{error}</p> : null}
          <button
            type="submit"
            disabled={pending || !token}
            className="btn-primary w-full justify-center disabled:opacity-50"
          >
            {pending ? "提交中…" : "确认重置"}
          </button>
          <p className="text-center text-[13px] text-[#6c685f]">
            <Link
              href="/forgot-password"
              className="font-medium text-[#171717] underline-offset-4 hover:underline"
            >
              重新申请
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F3ED] px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <MKBrand />
          </div>
          <h1 className="mt-6 text-[24px] font-semibold tracking-[-0.04em] text-[#171717]">
            设置新密码
          </h1>
        </div>
        <Suspense
          fallback={
            <div className="text-sm text-[#6c685f]">加载重置页…</div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
