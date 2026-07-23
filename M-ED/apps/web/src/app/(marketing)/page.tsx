import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MKBrand } from "@/components/brand/MKBrand";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F6F3ED] px-6 py-10 text-[#171717]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-between">
        <header>
          <MKBrand showTagline />
        </header>

        <section className="space-y-8 py-10">
          <div className="space-y-4">
            <p className="text-[12px] leading-5 tracking-[0.08em] text-[#77805F]">
              经营能力增长系统
            </p>
            <h1 className="font-display text-[38px] font-semibold leading-[1.02] tracking-[-0.06em] text-[#171717]">
              你的经营大脑已经开始工作
            </h1>
            <p className="text-[16px] leading-[1.8] text-[#5f5b54]">
              MealKey 不是功能平台，而是每天帮助餐饮经营者看清现实、完成判断、沉淀资产并持续成长的 AI 经营系统。
            </p>
          </div>

          <section className="rounded-[28px] border border-[rgba(23,23,23,0.08)] bg-white p-6 shadow-[0_14px_30px_rgba(24,24,23,0.04)]">
            <p className="text-[13px] leading-5 tracking-[0.01em] text-[#77805F]">
              经营诊断启动
            </p>
            <p className="mt-2 text-[28px] leading-[1.18] tracking-[-0.04em] text-[#171717]">
              我会先理解你的经营，再生成第一次 Today 判断。
            </p>
            <p className="mt-3 text-[15px] leading-[1.75] text-[#6c685f]">
              第一次进入不需要学习 AI，也不用填复杂资料。只回答三个关键问题，我就会先生成你的第一版经营画像、经营世界和今日判断。
            </p>

            <div className="mt-6 grid gap-3">
              <Link href="/register" className="btn-primary w-full">
                <span>创建经营大脑</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="btn-secondary w-full">
                <span>如果已经开始，去登录</span>
              </Link>
            </div>
          </section>
        </section>

        <footer className="pb-3 text-[12px] leading-5 text-[#6f747b]">
          餐饮的竞争，本质是经营认知的竞争。
        </footer>
      </div>
    </main>
  );
}
