import Link from "next/link";
import { MKBrand } from "@/components/brand/MKBrand";
import { PasswordReveal } from "./password-reveal";

function errorMessage(code?: string) {
  if (!code) return "";
  if (code === "CredentialsSignin") return "邮箱或密码不正确，请重新输入。";
  if (code === "MissingFields") return "请填写邮箱和密码。";
  if (code === "RateLimited") return "登录尝试过于频繁，请稍后再试。";
  return "登录失败，请稍后重试。";
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string; error?: string };
}) {
  const raw = searchParams?.callbackUrl;
  // 首次登录默认进基础信息收集；已 onboard 的账号由 middleware 再分流
  const callbackUrl =
    raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/onboarding";
  const error = errorMessage(searchParams?.error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F3ED] px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <MKBrand />
          </div>
          <h1 className="mt-6 text-[24px] font-semibold tracking-[-0.04em] text-[#171717] md:text-[26px]">
            登录
          </h1>
          <p className="mt-2 text-[14px] text-[#6c685f]">进入后先看今日该做什么</p>
          <p
            className="mt-1 text-[11px] text-[#9a958c]"
            data-login-build="v6-native-post"
          >
            原生表单 · v6
          </p>
        </div>

        <div className="card p-6">
          <form
            className="space-y-4"
            method="post"
            action="/api/auth/password-login"
          >
            <input type="hidden" name="callbackUrl" value={callbackUrl} />

            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-[13px] font-medium text-[#3d392f]"
              >
                邮箱
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                defaultValue="dev-login@mealkey.local"
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] text-[#171717] outline-none transition focus:border-[#66735E]"
                placeholder="邮箱"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-[13px] font-medium text-[#3d392f]"
              >
                密码
              </label>
              <PasswordReveal defaultValue="Mealkey123" />
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-[12px] font-medium text-[#66735E] underline-offset-2 hover:underline"
              >
                忘记密码？
              </Link>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-[14px] border border-[rgba(180,124,92,0.24)] bg-[rgba(180,124,92,0.08)] px-4 py-3 text-[13px] leading-6 text-[#8A4F31]"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="btn-primary mt-2 w-full justify-center"
            >
              登录
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-[#6c685f]">
            还没有账号？
            <Link
              href={
                callbackUrl !== "/dashboard"
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
    </div>
  );
}
