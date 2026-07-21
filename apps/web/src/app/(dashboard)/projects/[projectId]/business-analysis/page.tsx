"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 变化解读已收口到今日主页面模块，不再维护二级分析页。
 * 旧链接统一回今日。
 */
export default function BusinessAnalysisRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <p className="px-4 py-10 text-[14px] text-[#6f747b]">
      变化解读已在今日页，正在返回…
    </p>
  );
}
