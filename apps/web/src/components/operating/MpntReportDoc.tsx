"use client";

/**
 * M-PNT 呈交级报告排版 — 把 Markdown 渲染成咨询文档，而不是 <pre> 源码
 */
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  markdown: string;
  /** 默认展开；调研长文可限高 */
  maxHeightClass?: string;
  className?: string;
  /** 显示 ## 章节目录 */
  showToc?: boolean;
};

export function extractReportToc(
  markdown: string,
): Array<{ id: string; title: string }> {
  const lines = (markdown || "").split("\n");
  const toc: Array<{ id: string; title: string }> = [];
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (!m) continue;
    const title = m[1].trim().replace(/[#*`]/g, "");
    const id = `mpnt-sec-${toc.length + 1}`;
    toc.push({ id, title });
  }
  return toc;
}

export function MpntReportDoc({
  markdown,
  maxHeightClass = "max-h-[36rem]",
  className = "",
  showToc = false,
}: Props) {
  const source = useMemo(() => markdown?.trim() || "", [markdown]);
  const toc = useMemo(
    () => (showToc ? extractReportToc(source) : []),
    [showToc, source],
  );

  if (!source) return null;

  let h2Index = 0;

  return (
    <div className={className}>
      {toc.length > 0 ? (
        <nav
          aria-label="报告目录"
          className="mb-5 border border-[rgba(20,20,19,0.08)] bg-[rgba(95,107,78,0.04)] px-4 py-3"
        >
          <p className="text-[11px] font-medium tracking-[0.12em] text-[#5f6b4e]">
            目录
          </p>
          <ol className="mt-2 columns-1 gap-x-8 sm:columns-2">
            {toc.map((item, i) => (
              <li key={item.id} className="mb-1.5 break-inside-avoid">
                <a
                  href={`#${item.id}`}
                  className="text-[13px] leading-5 text-[#2a2a28] underline-offset-2 hover:text-[#5f6b4e] hover:underline"
                >
                  <span className="mr-1.5 tabular-nums text-[#9aa0a6]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className={`mpnt-report-scroll ${maxHeightClass} overflow-auto`}>
        <article className="mpnt-report-prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => {
                h2Index += 1;
                return <h2 id={`mpnt-sec-${h2Index}`}>{children}</h2>;
              },
            }}
          >
            {source}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
