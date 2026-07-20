"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";
import { MKBrand } from "@/components/brand/MKBrand";
import { InAppBrowserBanner } from "@/components/InAppBrowserBanner";

function RegisterForm() {
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => {
    const raw = searchParams?.get("callbackUrl");
    return raw && raw.startsWith("/") ? raw : null;
  }, [searchParams]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = useMemo(() => {
    const p = password;
    let score = 0;
    if (p.length >= 8) score += 1;
    if (p.length >= 12) score += 1;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score += 1;
    if (/\d/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;
    if (score <= 1) return { label: "弱", tone: "text-[#8A4F31]" };
    if (score <= 3) return { label: "中", tone: "text-[#66735E]" };
    return { label: "强", tone: "text-[#3d6b4f]" };
  }, [password]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    if (password.length < 8) {
      setError("密码至少 8 位");
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(payload?.error || "注册失败，请稍后重试。");
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/onboarding",
      });

      if (!signInResult || signInResult.error || signInResult.ok === false) {
        window.location.assign("/login");
        return;
      }

      // 整页跳转，确保会话 Cookie 已被 middleware 读到
      window.location.assign(
        signInResult.url && signInResult.url.startsWith("/")
          ? signInResult.url
          : "/onboarding",
      );
    } catch {
      setError("网络不稳或浏览器不兼容。请用 Safari / 系统浏览器再试一次。");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="flex justify-center">
          <MKBrand />
        </div>
        <h1 className="mt-6 text-[24px] font-semibold tracking-[-0.04em] text-[#171717] md:text-[26px]">
          注册
        </h1>
        <p className="mt-2 text-[14px] text-[#6c685f]">四个问题，开始用今日简报</p>
      </div>

      <InAppBrowserBanner variant="blocking" />
      <div className="card p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-[#3d392f]">姓名</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] text-[#171717] outline-none transition focus:border-[#66735E]"
              placeholder="怎么称呼你"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-[#3d392f]">邮箱</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] text-[#171717] outline-none transition focus:border-[#66735E]"
              placeholder="邮箱"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-[#3d392f]">密码</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] text-[#171717] outline-none transition focus:border-[#66735E]"
              placeholder="至少 8 位密码"
              minLength={8}
              required
            />
            {password ? (
              <p className={`mt-1.5 text-[12px] ${passwordStrength.tone}`}>
                强度：{passwordStrength.label}
              </p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-[#3d392f]">确认密码</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] text-[#171717] outline-none transition focus:border-[#66735E]"
              placeholder="再输入一次密码"
              minLength={8}
              required
            />
          </label>

          {error ? (
            <div className="rounded-[14px] border border-[rgba(180,124,92,0.24)] bg-[rgba(180,124,92,0.08)] px-4 py-3 text-[13px] leading-6 text-[#8A4F31]">
              {error}
            </div>
          ) : null}

          <button type="submit" disabled={isSubmitting} className="btn-primary mt-2 w-full justify-center">
            <span>{isSubmitting ? "创建中…" : "创建并开始"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-[#6c685f]">
          已有账号？
          <Link
            href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}
            className="ml-1 font-medium text-[#171717] underline-offset-4 hover:underline"
          >
            去登录
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F3ED] px-6 py-10">
      <Suspense fallback={<div className="text-sm text-[#6c685f]">加载中…</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
