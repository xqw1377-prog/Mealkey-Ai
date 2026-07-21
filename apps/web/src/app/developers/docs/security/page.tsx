import type { Metadata } from "next";

import {
  CodeBlock,
  DocHeader,
  DocSection,
  DocsLayout,
} from "../../_components/developer-portal";

export const metadata: Metadata = {
  title: "Security · Mealkey Developers",
};

export default function SecurityPage() {
  return (
    <DocsLayout activePath="/developers/docs/security">
      <DocHeader
        eyebrow="SECURITY"
        title="网关 · 权限 · 记忆隔离"
        description="Agent → Gateway → Permission Layer → MealKey。未安装即拒绝。"
        authority="EXTERNAL_INTERFACE §2 · PROTOCOL §8 · §11 · 宪法索引 §5"
      />
      <DocSection title="签名（V1）">
        <CodeBlock>{`Authorization: Bearer <user_access_token>
X-Agent-Id: <agent_id>
X-Timestamp: <unix_ms>
X-Signature: hmac_sha256(
  "{method}\\n{path}\\n{timestamp}\\n{sha256(body)}\\n{agent_id}",
  client_secret
)
时钟偏差 ±5 分钟`}</CodeBlock>
      </DocSection>
      <DocSection title="允许 / 禁止">
        <ul className="list-disc space-y-1 pl-5">
          <li>读：已授权 Brain 切片 / Identity / Evidence</li>
          <li>写：Signal · Insight · Gap · Learning 事件</li>
          <li>禁：Decision 拍板 · Execution 直写 · Memory DNA · 未安装 Context</li>
        </ul>
      </DocSection>
      <DocSection title="HTTP 错误">
        <CodeBlock>{`401  签名/Token 无效
403  未安装或 scope 拒绝
409  invokeId 冲突
422  Schema / Quality（见 rejected[]）
429  限流
503  Core 降级`}</CodeBlock>
      </DocSection>
    </DocsLayout>
  );
}
