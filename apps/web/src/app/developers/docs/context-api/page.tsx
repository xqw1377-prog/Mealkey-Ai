import type { Metadata } from "next";
import Link from "next/link";

import {
  CodeBlock,
  DocHeader,
  DocZones,
  DocsLayout,
} from "../../_components/developer-portal";

export const metadata: Metadata = {
  title: "Context API · Mealkey Developers",
};

export default function ContextApiPage() {
  return (
    <DocsLayout activePath="/developers/docs/context-api">
      <DocHeader
        eyebrow="CONTEXT API"
        title="租用餐厅上下文"
        description="只读。未授权 scope 进 scopesDenied，不靠猜。"
        authority="MEALKEY_AGENT_EXTERNAL_INTERFACE_V1 §3 · 宪法索引 §3"
      />
      <DocZones
        canDo={
          <p>
            让 Agent 获得<strong className="font-semibold text-[#202124]">经过授权</strong>
            的餐厅经营信息，用于诊断、分析与信号生成——无需自建采集闭环。
          </p>
        }
        contract={
          <>
            <CodeBlock>{`GET /v1/gateway/context/restaurant/{restaurantId}
    ?scope=basic,facts,review,operation,market

Headers:
  Authorization: Bearer <user_access_token>
  X-Agent-Id / X-Timestamp / X-Signature`}</CodeBlock>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <code>basic</code> — 品牌/店名/城市/品类
              </li>
              <li>
                <code>facts</code> — 经营事实最小集
              </li>
              <li>
                <code>review</code> — 评价证据切片
              </li>
              <li>
                <code>operation</code> / <code>market</code>
              </li>
              <li>
                <code>dna</code> — 高门槛，须 Manifest 声明
              </li>
            </ul>
            <CodeBlock>{`{
  "restaurantId": "…",
  "scopesGranted": ["basic", "facts", "review"],
  "scopesDenied": ["dna"],
  "identity": { "storeName": "XX湘菜", "city": "长沙" },
  "evidence": [{ "source": "dianping", "claim": "服务慢" }]
}`}</CodeBlock>
            <p className="text-[13px] text-[#6f747b]">
              字段以 External Interface 为准；禁止返回银行明细 / 原始 DB row。
            </p>
          </>
        }
        example={
          <>
            <CodeBlock>{`M-OPS 典型请求 scope:
  basic · review · operation

用于生成:
  signal · insight · gap`}</CodeBlock>
            <p>
              <Link
                href="/developers/examples/m-ops"
                className="font-medium text-[#465240] underline-offset-2 hover:underline"
              >
                打开 M-OPS Example
              </Link>
            </p>
          </>
        }
      />
    </DocsLayout>
  );
}
