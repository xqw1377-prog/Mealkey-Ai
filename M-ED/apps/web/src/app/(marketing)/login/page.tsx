"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";
import { MKBrand } from "@/components/brand/MKBrand";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => {
    const raw = searchParams?.get("callbackUrl");
    return raw && raw.startsWith("/") ? raw : "/dashboard";
  }, [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (!result || result.error) {
      setError("邮箱或密码不正确，请重新输入。");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="flex justify-center">
          <MKBrand subtitle="餐启" />
        </div>
        <h1 className="mt-6 text-[24px] font-semibold tracking-[-0.04em] text-[#171717] md:text-[26px]">
          餐饮经营能力增长系统
        </h1>
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
              placeholder="请输入邮箱"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-[#3d392f]">密码</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] text-[#171717] outline-none transition focus:border-[#66735E]"
              placeholder="请输入密码"
              required
            />
          </label>

          {error ? (
            <div className="rounded-[14px] border border-[rgba(180,124,92,0.24)] bg-[rgba(180,124,92,0.08)] px-4 py-3 text-[13px] leading-6 text-[#8A4F31]">
              {error}
            </div>
          ) : null}

          <button type="submit" disabled={isSubmitting} className="btn-primary mt-2 w-full justify-center">
            <span>{isSubmitting ? "登录中..." : "进入经营大脑"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-[#6c685f]">
          还没有账号？
          <Link
            href={callbackUrl && callbackUrl !== "/dashboard" ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"}
            className="ml-1 font-medium text-[#171717] underline-offset-4 hover:underline"
          >
            先创建
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F3ED] px-6 py-10">
      <Suspense fallback={<div className="text-sm text-[#6c685f]">加载登录页...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
