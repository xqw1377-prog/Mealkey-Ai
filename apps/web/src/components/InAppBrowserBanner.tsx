"use client";

import { useEffect, useState } from "react";
import {
  inAppBrowserGuideText,
  shouldGuideOpenInSystemBrowser,
} from "@/lib/wechat-browser";

type Props = {
  /**
   * sticky：顶栏常驻（经营壳）
   * blocking：关键路径（注册/充值），只能点「我改用浏览器了」暂隐
   */
  variant?: "default" | "sticky" | "blocking";
};

const DISMISS_KEY = "mk_inapp_browser_ack_v1";

/** 注册/建企/充值等：内置浏览器提示去系统浏览器 */
export function InAppBrowserBanner({ variant = "default" }: Props) {
  const [tip, setTip] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldGuideOpenInSystemBrowser()) return;
    if (variant !== "blocking") {
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
      } catch {
        /* ignore */
      }
    }
    setTip(inAppBrowserGuideText());
  }, [variant]);

  if (!tip) return null;

  const dismiss = () => {
    setTip(null);
    if (variant !== "blocking") {
      try {
        sessionStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  };

  const shell =
    variant === "sticky"
      ? "sticky top-0 z-40 mb-3 border-b border-[rgba(180,124,92,0.25)] bg-[rgba(255,248,240,0.97)] px-3 py-2.5 backdrop-blur-sm"
      : "mb-4 rounded-[14px] border border-[rgba(180,124,92,0.25)] bg-[rgba(180,124,92,0.08)] px-3 py-2.5";

  return (
    <div
      role="status"
      className={`flex items-start justify-between gap-2 text-[13px] leading-5 text-[#8a5a3c] ${shell}`}
    >
      <div className="min-w-0 space-y-1">
        <p className="font-medium">{tip}</p>
        {variant === "blocking" ? (
          <p className="text-[12px] text-[#9a6b4f]">
            在百度 / 微信里点「下一步」容易白屏或付不了款。请复制链接，用
            Safari / 系统浏览器打开。
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="inline-flex min-h-11 shrink-0 items-center px-2 text-[13px] font-medium underline underline-offset-2 touch-manipulation"
      >
        {variant === "blocking" ? "我改用浏览器了" : "知道了"}
      </button>
    </div>
  );
}
