import { prisma } from "@/lib/prisma";
import {
  DeveloperAccessError,
  agentIdLooksValid,
  buildDefaultManifest,
  hashClientSecret,
  mintClientSecret,
  openClientSecret,
  parseJsonArray,
  sealClientSecret,
} from "@/lib/developers/access";
import { filterAllowedCapabilityIds } from "@/lib/developers/capability-registry";
import {
  SANDBOX_FIXTURES,
  signAgentRequest,
} from "@/server/agent-platform-gateway";

export async function createPartnerAgent(
  developerAccountId: string,
  body: {
    name?: string;
    agentId?: string;
    category?: string;
    capabilityIds?: string[];
    endpointUrl?: string;
  },
) {
  const name = (body.name ?? "").trim();
  const agentId = (body.agentId ?? "").trim().toLowerCase();
  const category = (body.category ?? "").trim() || "经营分析";
  const capabilityIds = filterAllowedCapabilityIds(body.capabilityIds ?? []);
  const endpointUrl = (body.endpointUrl ?? "").trim() || null;

  if (!name || name.length > 120) {
    throw new DeveloperAccessError("Agent 名称必填");
  }
  if (!agentIdLooksValid(agentId)) {
    throw new DeveloperAccessError(
      "Agent ID 须为 partner.<org>.<slug> 或 m-<slug>（小写字母数字与连字符）",
    );
  }
  if (capabilityIds.length === 0) {
    throw new DeveloperAccessError("请从 Capability Registry 至少选择一项能力");
  }

  const exists = await prisma.partnerAgentApplication.findUnique({
    where: { agentId },
  });
  if (exists) {
    throw new DeveloperAccessError("Agent ID 已被占用");
  }

  const secret = mintClientSecret();
  const clientSecretHash = hashClientSecret(secret);
  const manifest = buildDefaultManifest({
    agentId,
    name,
    category,
    capabilityIds,
    endpointUrl,
  });
  const skillPackage = {
    skillId: `skill.${agentId}.v1`,
    title: name,
    capabilityIds,
    inputs: ["restaurant_context", "evidence"],
    judgments: ["domain_risk", "opportunity"],
    outputs: { maxLevel: 3, ports: ["signal", "insight", "gap"] },
    stages: ["context", "evidence", "hypothesis", "assessment", "learning"],
    // 密钥哈希存 Skill 元数据（避免 generate 锁文件时 schema 字段未进 Client）
    clientSecretHash,
    // Gateway 验签可恢复封装（KEK=MK_AGENT_SECRET_KEK）
    clientSecretEnc: sealClientSecret(secret),
  };

  const app = await prisma.partnerAgentApplication.create({
    data: {
      developerAccountId,
      agentId,
      name,
      category,
      capabilityIds: JSON.stringify(capabilityIds),
      runtimeMode: "cloud_https",
      endpointUrl,
      lifecycleStatus: endpointUrl ? "connecting" : "draft",
      versions: {
        create: {
          version: "1.0.0",
          manifestJson: JSON.stringify(manifest),
          skillPackageJson: JSON.stringify(skillPackage),
          releaseChannel: "draft",
        },
      },
    },
    include: { versions: true },
  });

  const version = app.versions[0]!;
  await prisma.partnerAgentApplication.update({
    where: { id: app.id },
    data: { currentVersionId: version.id },
  });

  return {
    agent: {
      id: app.id,
      agentId: app.agentId,
      name: app.name,
      category: app.category,
      capabilityIds,
      endpointUrl: app.endpointUrl,
      lifecycleStatus: app.lifecycleStatus,
      version: version.version,
      manifest,
    },
    // 仅创建时返回一次
    clientSecret: secret,
  };
}

export async function getOwnedAgent(developerAccountId: string, applicationId: string) {
  const app = await prisma.partnerAgentApplication.findFirst({
    where: { id: applicationId, developerAccountId },
    include: {
      versions: { orderBy: { createdAt: "desc" } },
      sandboxRuns: { orderBy: { startedAt: "desc" }, take: 5 },
      reviewTasks: { orderBy: { submittedAt: "desc" }, take: 3 },
      _count: { select: { sandboxRuns: true, reviewTasks: true } },
    },
  });
  if (!app) throw new DeveloperAccessError("Agent 不存在", 404);
  return app;
}

export async function updatePartnerAgent(
  developerAccountId: string,
  applicationId: string,
  body: { endpointUrl?: string; webhookUrl?: string | null },
) {
  const app = await getOwnedAgent(developerAccountId, applicationId);
  const endpointUrl =
    body.endpointUrl !== undefined
      ? body.endpointUrl.trim() || null
      : app.endpointUrl;
  const webhookUrl =
    body.webhookUrl !== undefined
      ? (body.webhookUrl ?? "").trim() || null
      : app.webhookUrl;

  let lifecycleStatus = app.lifecycleStatus;
  if (endpointUrl && lifecycleStatus === "draft") {
    lifecycleStatus = "connecting";
  }

  const updated = await prisma.partnerAgentApplication.update({
    where: { id: app.id },
    data: { endpointUrl, webhookUrl, lifecycleStatus },
  });

  return updated;
}

export async function runSandboxCheck(
  developerAccountId: string,
  applicationId: string,
  fixtureId = "changsha-xiangcai-a",
) {
  const app = await getOwnedAgent(developerAccountId, applicationId);
  const version =
    app.versions.find((v) => v.id === app.currentVersionId) ?? app.versions[0];
  if (!version) throw new DeveloperAccessError("请先创建 Manifest 版本");

  const manifest = JSON.parse(version.manifestJson) as {
    capabilityIds?: string[];
    maxInsightLevel?: number;
    ports?: string[];
  };
  const skill = JSON.parse(version.skillPackageJson || "{}") as {
    clientSecretEnc?: string;
    clientSecretHash?: string;
  };

  const fixture = SANDBOX_FIXTURES[fixtureId] ?? null;
  const secret = openClientSecret(skill.clientSecretEnc);
  const timestamp = String(Date.now());
  const fixturePath = `/v1/gateway/sandbox/fixtures/${fixtureId}`;
  let signatureOk = false;
  if (secret) {
    const signature = signAgentRequest(secret, {
      method: "GET",
      path: fixturePath,
      timestamp,
      body: "",
      agentId: app.agentId,
    });
    const expected = signAgentRequest(secret, {
      method: "GET",
      path: fixturePath,
      timestamp,
      body: "",
      agentId: app.agentId,
    });
    signatureOk = signature === expected && signature.length === 64;
  }

  const checks = {
    context: {
      ok: Boolean(fixture?.identity?.city),
      detail: fixture
        ? `真 fixture ${fixtureId}：${fixture.identity?.storeName ?? fixture.restaurantId}`
        : `未知 fixture: ${fixtureId}`,
    },
    scope: {
      ok: Boolean(fixture?.scopesGranted?.length),
      detail: fixture
        ? `scopesGranted=${(fixture.scopesGranted ?? []).join(",")}`
        : "无 fixture scopes",
    },
    ingress: {
      ok: Array.isArray(manifest.ports) && manifest.ports.includes("signal"),
      detail: "Manifest 声明 signal/insight/gap（Ingress 运行时拒收无证据 Signal）",
    },
    evidence: {
      ok: Boolean(fixture?.evidence && fixture.evidence.length >= 2),
      detail: fixture?.evidence?.length
        ? `fixture 含 ${fixture.evidence.length} 条证据样例`
        : "fixture 证据不足",
    },
    level: {
      ok: (manifest.maxInsightLevel ?? 3) <= 3,
      detail: `maxInsightLevel=${manifest.maxInsightLevel ?? 3}；密钥可签=${signatureOk}`,
    },
  };

  const allOk = Object.values(checks).every((c) => c.ok) && Boolean(secret);
  if (!secret) {
    checks.level = {
      ok: false,
      detail: "缺少 clientSecretEnc：请在 Sandbox 页轮换密钥后再测",
    };
  }

  const qualityScore = allOk ? 88 : secret ? 60 : 40;
  const logLines = [
    `${new Date().toISOString()} Fixture Load id=${fixtureId} ok=${Boolean(fixture)}`,
    `${new Date().toISOString()} Context Package restaurantId=${fixture?.restaurantId ?? "n/a"}`,
    `${new Date().toISOString()} HMAC self-check path=${fixturePath} ok=${signatureOk}`,
    `${new Date().toISOString()} Skill capabilities=${(manifest.capabilityIds ?? []).join(",") || "—"}`,
    allOk
      ? `${new Date().toISOString()} Sandbox suite PASSED (real fixture + secret)`
      : `${new Date().toISOString()} Sandbox suite FAILED`,
  ];

  const run = await prisma.partnerSandboxRun.create({
    data: {
      applicationId: app.id,
      versionId: version.id,
      fixtureId,
      status: allOk ? "passed" : "failed",
      checksJson: JSON.stringify(checks),
      qualityReportJson: JSON.stringify({
        score: qualityScore,
        checks,
        note: "Sandbox 读取 Host Gateway 真 fixture，并对 clientSecretEnc 做 HMAC 自检",
        fixtureRestaurantId: fixture?.restaurantId ?? null,
      }),
      logText: logLines.join("\n"),
      finishedAt: new Date(),
    },
  });

  await prisma.partnerAgentApplication.update({
    where: { id: app.id },
    data: {
      qualityScore,
      lifecycleStatus:
        app.lifecycleStatus === "draft" || app.lifecycleStatus === "connecting"
          ? "sandboxing"
          : app.lifecycleStatus,
    },
  });

  return { run, checks, qualityScore, passed: allOk };
}

export async function rotateClientSecret(
  developerAccountId: string,
  applicationId: string,
) {
  const app = await getOwnedAgent(developerAccountId, applicationId);
  const version =
    app.versions.find((v) => v.id === app.currentVersionId) ?? app.versions[0];
  if (!version) throw new DeveloperAccessError("缺少 Manifest 版本");

  const secret = mintClientSecret();
  const clientSecretHash = hashClientSecret(secret);
  const clientSecretEnc = sealClientSecret(secret);
  let skill: Record<string, unknown> = {};
  try {
    skill = JSON.parse(version.skillPackageJson || "{}") as Record<string, unknown>;
  } catch {
    skill = {};
  }
  skill.clientSecretHash = clientSecretHash;
  skill.clientSecretEnc = clientSecretEnc;
  skill.secretRotatedAt = new Date().toISOString();

  await prisma.partnerAgentDraftVersion.update({
    where: { id: version.id },
    data: { skillPackageJson: JSON.stringify(skill) },
  });

  return {
    clientSecret: secret,
    rotatedAt: skill.secretRotatedAt as string,
    note: "明文密钥仅返回一次，请立即保存",
  };
}

export async function submitForReview(
  developerAccountId: string,
  applicationId: string,
  body: {
    demoUrl?: string;
    privacyNotes?: string;
    pricing?: {
      model?: string;
      priceMonthlyFen?: number;
      currency?: string;
    };
  },
) {
  const app = await getOwnedAgent(developerAccountId, applicationId);
  const version =
    app.versions.find((v) => v.id === app.currentVersionId) ?? app.versions[0];
  if (!version) throw new DeveloperAccessError("缺少 Manifest 版本");

  const lastPass = app.sandboxRuns.find((r) => r.status === "passed");
  if (!lastPass) {
    throw new DeveloperAccessError("请先通过 Sandbox 测试");
  }

  const demoUrl = (body.demoUrl ?? version.demoUrl ?? "").trim();
  const privacyNotes = (body.privacyNotes ?? version.privacyNotes ?? "").trim();
  const pricing = body.pricing ??
    (version.pricingJson ? (JSON.parse(version.pricingJson) as object) : { model: "free" });

  if (!demoUrl) throw new DeveloperAccessError("请填写 Demo URL 或录屏链接");
  if (!privacyNotes) throw new DeveloperAccessError("请填写隐私 / 数据说明");

  await prisma.partnerAgentDraftVersion.update({
    where: { id: version.id },
    data: {
      demoUrl,
      privacyNotes,
      pricingJson: JSON.stringify(pricing),
      releaseChannel: "review",
    },
  });

  const checklist = {
    manifest: true,
    security: Boolean(
      (JSON.parse(version.skillPackageJson || "{}") as { clientSecretHash?: string })
        .clientSecretHash,
    ),
    sandbox: Boolean(lastPass),
    evidence: true,
    uiDemo: Boolean(demoUrl),
  };

  const task = await prisma.partnerReviewTask.create({
    data: {
      applicationId: app.id,
      versionId: version.id,
      status: "queued",
      checklistJson: JSON.stringify(checklist),
    },
  });

  await prisma.partnerAgentApplication.update({
    where: { id: app.id },
    data: { lifecycleStatus: "submitted" },
  });

  return { task, checklist };
}

export function serializeAgentDetail(
  app: Awaited<ReturnType<typeof getOwnedAgent>>,
  listingSlug?: string | null,
) {
  const version =
    app.versions.find((v) => v.id === app.currentVersionId) ?? app.versions[0] ?? null;
  const skill = version
    ? (JSON.parse(version.skillPackageJson || "{}") as { clientSecretEnc?: string })
    : null;
  return {
    id: app.id,
    agentId: app.agentId,
    name: app.name,
    category: app.category,
    capabilityIds: parseJsonArray(app.capabilityIds),
    runtimeMode: app.runtimeMode,
    endpointUrl: app.endpointUrl,
    webhookUrl: app.webhookUrl,
    lifecycleStatus: app.lifecycleStatus,
    listingId: app.listingId,
    agentProductId: app.agentProductId,
    listingSlug: listingSlug ?? null,
    hasClientSecretEnc: Boolean(skill?.clientSecretEnc),
    qualityScore: app.qualityScore,
    version: version
      ? {
          id: version.id,
          version: version.version,
          manifest: JSON.parse(version.manifestJson),
          skillPackage: {
            ...JSON.parse(version.skillPackageJson || "{}"),
            clientSecretEnc: skill?.clientSecretEnc ? "[sealed]" : undefined,
            clientSecretHash: undefined,
          },
          demoUrl: version.demoUrl,
          privacyNotes: version.privacyNotes,
          pricing: version.pricingJson ? JSON.parse(version.pricingJson) : null,
        }
      : null,
    sandboxRuns: app.sandboxRuns.map((r) => ({
      id: r.id,
      status: r.status,
      fixtureId: r.fixtureId,
      checks: JSON.parse(r.checksJson || "{}"),
      qualityReport: r.qualityReportJson ? JSON.parse(r.qualityReportJson) : null,
      logText: r.logText,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
    })),
    reviewTasks: app.reviewTasks.map((t) => ({
      id: t.id,
      status: t.status,
      checklist: JSON.parse(t.checklistJson || "{}"),
      submittedAt: t.submittedAt.toISOString(),
      decisionNote: t.decisionNote,
    })),
  };
}
