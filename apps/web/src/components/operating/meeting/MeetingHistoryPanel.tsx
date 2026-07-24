"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type MeetingHistoryItem = {
  id: string;
  topic: string;
  summary: string;
  recommendation?: string | null;
  createdAt: string;
};

type Props = {
  projectId: string;
  items: MeetingHistoryItem[];
  onClose: () => void;
};

/**
 * 顾问会商历史列表面板 — 自持 preview 状态。
 */
export function MeetingHistoryPanel({ projectId, items, onClose }: Props) {
  const [preview, setPreview] = useState<MeetingHistoryItem | null>(null);

  return (
    <section className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">会商历史</p>
          <h2 className="mt-1 text-[18px] font-semibold text-[#202124]">近期顾问会商</h2>
        </div>
        <button type="button" onClick={onClose} className="text-[13px] text-[#6f747b]">
          收起
        </button>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-[14px] leading-6 text-[#6f747b]">
          暂无已落库的会商摘要。完成一轮独立判断后会出现在这里。
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setPreview(item)}
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-[#FBFAF7] px-3 py-3 text-left transition hover:bg-[#F5F3EE]"
              >
                <p className="text-[14px] font-medium text-[#202124]">{item.topic}</p>
                <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#6f747b]">
                  {item.summary}
                </p>
                <p className="mt-1 text-[11px] text-[#9aa0a6]">
                  {new Date(item.createdAt).toLocaleString("zh-CN")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {preview ? (
        <div className="mt-3 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#EEF1EA] p-3">
          <p className="text-[13px] font-semibold text-[#202124]">{preview.topic}</p>
          <p className="mt-2 text-[13px] leading-6 text-[#5f6368]">{preview.summary}</p>
          {preview.recommendation ? (
            <p className="mt-2 text-[13px] leading-6 text-[#202124]">
              建议：{preview.recommendation}
            </p>
          ) : null}
        </div>
      ) : null}
      <Link
        href={`/projects/${projectId}/decisions`}
        prefetch={false}
        className="mt-3 inline-flex items-center gap-2 text-[13px] font-medium text-[#202124] no-underline"
      >
        去跟进
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
