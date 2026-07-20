"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  shouldGuideOpenInBrowserForWechatPay,
  wechatPayOpenInBrowserSteps,
} from "@/lib/wechat-browser";

type Props = {
  codeUrl: string;
  orderNo: string;
  amountCents: number;
  polling?: boolean;
};

export function WechatNativePayPanel({
  codeUrl,
  orderNo,
  amountCents,
  polling,
}: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [inWeChat, setInWeChat] = useState(false);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  useEffect(() => {
    setInWeChat(shouldGuideOpenInBrowserForWechatPay());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setQrError(null);
    setQrDataUrl(null);
    void QRCode.toDataURL(codeUrl, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#181817", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrError("二维码生成失败，请复制支付链接到微信打开");
      });
    return () => {
      cancelled = true;
    };
  }, [codeUrl]);

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint(`已复制${label}`);
      window.setTimeout(() => setCopyHint(null), 2200);
    } catch {
      setCopyHint("复制失败，请长按选中文字");
      window.setTimeout(() => setCopyHint(null), 2500);
    }
  }

  const pageUrl =
    typeof window !== "undefined" ? window.location.href.split("#")[0] : "";

  return (
    <div className="mt-4 space-y-3 border border-[rgba(24,24,23,0.08)] bg-[#F8F7F3] p-4">
      <p className="text-[14px] font-medium text-[#202124]">微信扫码支付</p>
      <p className="text-[13px] text-[#6f747b]">
        订单 {orderNo} · ¥{(amountCents / 100).toFixed(2)}
        {polling ? " · 支付完成后将自动到账" : ""}
      </p>

      {inWeChat ? (
        <div className="space-y-2 border border-[rgba(180,124,92,0.28)] bg-[rgba(180,124,92,0.1)] px-3 py-3 text-[13px] leading-5 text-[#8a5a3c]">
          <p className="font-semibold text-[#6b442f]">
            微信里扫不了本页收款码，请按三步完成：
          </p>
          <ol className="list-decimal space-y-1 pl-4">
            {wechatPayOpenInBrowserSteps().map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {pageUrl ? (
            <button
              type="button"
              className="mt-1 text-[13px] font-semibold text-[#181817] underline-offset-2 hover:underline"
              onClick={() => void copyText("充值页链接", pageUrl)}
            >
              复制本页链接（到 Safari / 系统浏览器打开）
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-[13px] text-[#66735E]">
          请使用微信「扫一扫」扫描下方二维码；到账后本页会自动刷新余额。
        </p>
      )}

      <div className="flex flex-col items-center gap-3 py-2">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="微信支付二维码"
            width={220}
            height={220}
            className="border border-[rgba(24,24,23,0.08)] bg-white p-2"
          />
        ) : (
          <div className="flex h-[220px] w-[220px] items-center justify-center border border-[rgba(24,24,23,0.08)] bg-white text-[13px] text-[#6f747b]">
            {qrError || "生成二维码中…"}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="text-[13px] font-medium text-[#181817] underline-offset-2 hover:underline"
            onClick={() => void copyText("支付链接", codeUrl)}
          >
            复制支付链接
          </button>
          {pageUrl ? (
            <button
              type="button"
              className="text-[13px] font-medium text-[#181817] underline-offset-2 hover:underline"
              onClick={() => void copyText("充值页链接", pageUrl)}
            >
              复制充值页链接
            </button>
          ) : null}
        </div>
        {copyHint ? (
          <p className="text-[12px] text-[#66735E]">{copyHint}</p>
        ) : null}
      </div>
    </div>
  );
}
