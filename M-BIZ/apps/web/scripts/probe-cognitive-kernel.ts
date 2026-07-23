import { prisma } from "../src/lib/prisma";
import { createDecision } from "../src/server/services/agent-os.service";

async function main() {
  const owner = await prisma.owner.findFirst({ select: { id: true } });
  if (!owner) {
    console.log(JSON.stringify({ ok: false, reason: "NO_OWNER" }, null, 2));
    return;
  }

  const record = await createDecision(prisma, {
    ownerId: owner.id,
    agentId: "probe-agent",
    type: "general",
    problem: "认知内核探针",
    observation: "观察到一条结构化证据链",
    diagnosis: "当前链路需要持久化认知事实",
    judgement: "先落认知内核事实层",
    strategy: "把 evidence 结构化映射为 trace 和 evidence reference",
    action: "写入 session/trace/evidence/confidence",
    confidence: 0.84,
    evidence: [
      { source: "observation", content: "用户连续强调认知内核是核心", relevance: 0.92 },
      { source: "knowledge_rule:R027", content: "规则 R027 参与高风险校验", relevance: 0.88 },
      { source: "knowledge_case:C102", content: "历史案例 C102 证明结构优化有效", relevance: 0.73 },
      { source: "tool", content: JSON.stringify({ signal: "market_context" }), relevance: 0.66 },
    ],
  });

  const sessionId = `cs_${record.id}`;
  const sessionRows = await prisma.$queryRawUnsafe(
    'SELECT * FROM "CognitiveSession" WHERE "decisionId" = ? ORDER BY "createdAt" DESC LIMIT 1',
    record.id,
  );
  const traceRows = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*) as count FROM "CognitiveTrace" WHERE "sessionId" = ?',
    sessionId,
  );
  const evidenceRows = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*) as count FROM "EvidenceReference" WHERE "decisionId" = ?',
    record.id,
  );
  const confidenceRows = await prisma.$queryRawUnsafe(
    'SELECT * FROM "ConfidenceModel" WHERE "sessionId" = ? LIMIT 1',
    sessionId,
  );

  const normalize = (value: unknown): unknown =>
    JSON.parse(
      JSON.stringify(value, (_, item) => (typeof item === "bigint" ? Number(item) : item)),
    );

  console.log(
    JSON.stringify(
      {
        ok: true,
        decisionId: record.id,
        sessionRows: normalize(sessionRows),
        traceRows: normalize(traceRows),
        evidenceRows: normalize(evidenceRows),
        confidenceRows: normalize(confidenceRows),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
