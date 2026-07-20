"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { MKBrand } from "@/components/brand/MKBrand";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => {
    const raw = searchParams?.get("callbackUrl");
    return raw && raw.startsWith("/") ? raw : "/dashboard";
  }, [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result || result.error || result.ok === false) {
        setError("邮箱或密码不正确，请重新输入。");
        setIsSubmitting(false);
        return;
      }

      // 必须整页跳转：客户端 router.push 时常在 Cookie 尚未被 middleware 读到前就进 /dashboard，
      // 会被踢回登录页，表现为「要点好几次登录」。
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
      </div>

      <div className="card p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white py-3 pl-4 pr-12 text-[15px] text-[#171717] outline-none transition focus:border-[#66735E]"
                placeholder="密码"
                required
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

          <button type="submit" disabled={isSubmitting} className="btn-primary mt-2 w-full justify-center">
            <span>{isSubmitting ? "登录中…" : "登录"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-[#6c685f]">
          还没有账号？
          <Link
            href={callbackUrl && callbackUrl !== "/dashboard" ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"}
            className="ml-1 font-medium text-[#171717] underline-offset-4 hover:underline"
          >
            注册
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F3ED] px-6 py-10">
      <Suspense fallback={<div className="text-sm text-[#6c685f]">加载中…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
