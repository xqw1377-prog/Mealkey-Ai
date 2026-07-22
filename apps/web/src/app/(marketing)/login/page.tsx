"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { getSession, signIn } from "next-auth/react";
import { MKBrand } from "@/components/brand/MKBrand";

function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    if (isSubmitting) return;
    setError("");

    // 非受控：直接读 DOM，React 绝不会在点击时把输入清成空
    const nextEmail = (emailRef.current?.value || "").trim();
    const nextPassword = passwordRef.current?.value || "";

    if (!nextEmail || !nextPassword) {
      setError("请填写邮箱和密码。");
      emailRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: nextEmail,
        password: nextPassword,
        redirect: false,
        callbackUrl,
      });

      if (!result || result.error || result.ok === false) {
        setError(
          result?.error === "CredentialsSignin"
            ? "邮箱或密码不正确，请重新输入。"
            : "登录失败，请检查账号或稍后重试。",
        );
        setIsSubmitting(false);
        return;
      }

      // 等会话 Cookie 可读，再整页跳转，避免被 middleware 踢回空登录页
      for (let i = 0; i < 12; i++) {
        const session = await getSession();
        if (session?.user) break;
        await new Promise((r) => setTimeout(r, 80));
      }

      const nextUrl =
        result.url && result.url.startsWith("/")
          ? result.url
          : callbackUrl;
      window.location.assign(nextUrl);
    } catch {
      setError("登录失败，请稍后重试。");
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
          登录
        </h1>
        <p className="mt-2 text-[14px] text-[#6c685f]">进入后先看今日该做什么</p>
        <p className="mt-1 text-[11px] text-[#9a958c]" data-login-build="v3-uncontrolled">
          表单修复 v3 · 若仍见英文提示请强制刷新
        </p>
      </div>

      <div className="card p-6">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-[#3d392f]">邮箱</span>
            <input
              ref={emailRef}
              name="email"
              type="email"
              autoComplete="username"
              defaultValue=""
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] text-[#171717] outline-none transition focus:border-[#66735E]"
              placeholder="邮箱"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-[#3d392f]">密码</span>
            <div className="relative">
              <input
                ref={passwordRef}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                defaultValue=""
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white py-3 pl-4 pr-12 text-[15px] text-[#171717] outline-none transition focus:border-[#66735E]"
                placeholder="密码"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleLogin();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-[14px] px-3 text-[#6f747b] transition hover:text-[#171717] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#66735E]"
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </label>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[12px] font-medium text-[#66735E] underline-offset-2 hover:underline"
            >
              忘记密码？
            </Link>
          </div>

          {error ? (
            <div className="rounded-[14px] border border-[rgba(180,124,92,0.24)] bg-[rgba(180,124,92,0.08)] px-4 py-3 text-[13px] leading-6 text-[#8A4F31]">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleLogin()}
            className="btn-primary mt-2 w-full justify-center"
          >
            <span>{isSubmitting ? "登录中…" : "登录"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 text-center text-sm text-[#6c685f]">
          还没有账号？
          <Link
            href={
              callbackUrl && callbackUrl !== "/dashboard"
                ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
                : "/register"
            }
            className="ml-1 font-medium text-[#171717] underline-offset-4 hover:underline"
          >
            注册
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => {
    const raw = searchParams?.get("callbackUrl");
    return raw && raw.startsWith("/") ? raw : "/dashboard";
  }, [searchParams]);

  return <LoginForm callbackUrl={callbackUrl} />;
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F3ED] px-6 py-10">
      <Suspense fallback={<div className="text-sm text-[#6c685f]">加载中…</div>}>
        <LoginPageInner />
      </Suspense>
    </div>
  );
}
