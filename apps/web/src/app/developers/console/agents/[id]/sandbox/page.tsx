"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  CodeBlock,
  DeveloperShell,
  DocHeader,
} from "../../../../_components/developer-portal";

type AgentDetail = {
  id: string;
  name: string;
  agentId: string;
  lifecycleLabel?: string;
  lifecycleStatus: string;
  endpointUrl: string | null;
  qualityScore: number | null;
  sandboxRuns: Array<{
    id: string;
    status: string;
    checks: Record<string, { ok?: boolean; detail?: string }>;
    logText: string | null;
    qualityReport: { score?: number } | null;
  }>;
};

export default function AgentSandboxPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const router = useRouter();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [endpointUrl, setEndpointUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLog, setLastLog] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, { ok?: boolean; detail?: string }> | null>(
    null,
  );

  const [lastSecret, setLastSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/developers/agents/${id}`, { cache: "no-store" });
    const body = (await res.json()) as { ok?: boolean; error?: string; agent?: AgentDetail };
    if (res.status === 401) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/developers/console/agents/${id}/sandbox`)}`);
      return;
    }
    if (!res.ok || !body.ok || !body.agent) {
      setError(body.error || "加载失败");
      return;
    }
    setAgent(body.agent);
    setEndpointUrl(body.agent.endpointUrl ?? "");
    const latest = body.agent.sandboxRuns[0];
    if (latest) {
      setChecks(latest.checks);
      setLastLog(latest.logText);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveEndpoint() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/developers/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointUrl }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error || "保存失败");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function rotateSecret() {
    setBusy(true);
    setError(null);
    setLastSecret(null);
    try {
      const res = await fetch(`/api/developers/agents/${id}/rotate-secret`, {
        method: "POST",
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        clientSecret?: string;
        note?: string;
      };
      if (!res.ok || !body.ok || !body.clientSecret) {
        throw new Error(body.error || "轮换失败");
      }
      setLastSecret(body.clientSecret);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "轮换失败");
    } finally {
      setBusy(false);
    }
  }

  async function runSuite() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/developers/agents/${id}/sandbox-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixtureId: "changsha-xiangcai-a" }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        checks?: Record<string, { ok?: boolean; detail?: string }>;
        run?: { logText?: string };
        qualityScore?: number;
      };
      if (!res.ok || !body.ok) throw new Error(body.error || "运行失败");
      setChecks(body.checks ?? null);
      setLastLog(body.run?.logText ?? null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "运行失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeveloperShell activePath="/developers/console">
      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <DocHeader
          eyebrow="SANDBOX"
          title={agent ? `${agent.name} · Sandbox` : "Sandbox"}
          description="左：环境与连接。右：检查结果与日志。失败项展示契约说明，不改拒收码语义。"
          authority="UI/UX §5 · External Interface 拒收码"
        />

        {error ? <p className="mb-4 text-[13px] text-[#8b3a2f]">{error}</p> : null}

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-4">
            <p className="text-[11px] font-medium tracking-[0.1em] text-[#66735E]">环境</p>
            <div className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white/70 px-4 py-3 text-[13px]">
              <p>
                Restaurant fixture：<strong>长沙湘菜A店</strong>（changsha-xiangcai-a）
              </p>
              <p className="mt-2 text-[#6f747b]">Context：basic · review · operation</p>
              {agent ? (
                <p className="mt-2 text-[#6f747b]">
                  状态 {agent.lifecycleStatus} · Quality {agent.qualityScore ?? "—"}
                </p>
              ) : null}
            </div>
            <label className="block space-y-1.5">
              <span className="text-[12px] text-[#5f6368]">Endpoint URL</span>
              <input
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px]"
                placeholder="https://your-agent.example.com"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveEndpoint()}
                className="rounded-[10px] border border-[rgba(24,24,23,0.1)] bg-white px-4 py-2 text-[13px] font-medium disabled:opacity-50"
              >
                保存连接
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runSuite()}
                className="rounded-[10px] bg-[#181817] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {busy ? "运行中…" : "Run suite"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void rotateSecret()}
                className="rounded-[10px] border border-[rgba(24,24,23,0.1)] bg-white px-4 py-2 text-[13px] font-medium disabled:opacity-50"
              >
                轮换 client_secret
              </button>
            </div>
            {lastSecret ? (
              <div className="rounded-[12px] border border-[rgba(139,58,47,0.25)] bg-[#fff8f6] px-3 py-3 text-[12px] text-[#8b3a2f]">
                <p className="font-medium">明文密钥仅显示一次，请立即保存：</p>
                <CodeBlock>{lastSecret}</CodeBlock>
              </div>
            ) : null}
          </section>

          <section className="space-y-4">
            <p className="text-[11px] font-medium tracking-[0.1em] text-[#66735E]">检查清单</p>
            <ul className="space-y-2 text-[13px]">
              {(
                [
                  ["context", "Context 读取"],
                  ["scope", "Scope 检查"],
                  ["ingress", "Ingress 输出"],
                  ["evidence", "Evidence 检查"],
                  ["level", "Level 检查"],
                ] as const
              ).map(([key, label]) => {
                const item = checks?.[key];
                const ok = item?.ok;
                return (
                  <li
                    key={key}
                    className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white/70 px-3 py-2.5"
                  >
                    <span className="font-medium text-[#171717]">
                      {ok === true ? "✓" : ok === false ? "✗" : "·"} {label}
                    </span>
                    {item?.detail ? (
                      <p className="mt-1 text-[12px] text-[#6f747b]">{item.detail}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {lastLog ? (
              <div>
                <p className="mb-2 text-[11px] font-medium tracking-[0.1em] text-[#66735E]">日志</p>
                <CodeBlock>{lastLog}</CodeBlock>
              </div>
            ) : null}
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-[13px]">
          <Link
            href={`/developers/console/agents/${id}/submit`}
            className="font-medium text-[#465240] underline-offset-2 hover:underline"
          >
            下一步：提交审核
          </Link>
          <Link
            href="/developers/console"
            className="font-medium text-[#465240] underline-offset-2 hover:underline"
          >
            返回 Console
          </Link>
        </div>
      </main>
    </DeveloperShell>
  );
}
