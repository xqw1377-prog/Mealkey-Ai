/**
 * Mobile compile 单席真能力外呼（失败返回 null，由 capability-invoke 降级）
 * 不暴露席位名给老板；不跑整席会议 / Council。
 */
import type { CompileOutputV1, IntentFamily } from "../contracts/goal-compiler";
import type { KnownCompileContext } from "./known-context";

export type SeatInvokeHit = {
  bullets: string[];
  nextStep?: string;
  providerTag: string;
};

function routeSeat(family: IntentFamily): "m-biz" | "m-pnt" | "m-mkt" {
  if (family === "positioning" || family === "menu_optimize") return "m-pnt";
  if (family === "launch_store" || family === "expand_store") return "m-mkt";
  return "m-biz";
}

function companyContext(
  projectId: string,
  known: KnownCompileContext | undefined,
  goalTitle: string,
) {
  return {
    companyId: projectId,
    basicInfo: {
      name: known?.brandName || "餐饮项目",
      industry: known?.category || "餐饮",
      city: known?.city || "目标城市",
      stage: known?.stage || "经营期",
    },
    brand: known?.brandName
      ? { name: known.brandName }
      : undefined,
    goals: [goalTitle].filter(Boolean),
  };
}

function buildMessage(output: CompileOutputV1, fileText?: string): string {
  return [
    output.goal.title,
    output.goal.intentRaw,
    fileText?.slice(0, 2000),
    output.artifacts[0]?.body.slice(0, 1200),
  ]
    .filter(Boolean)
    .join("\n");
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function clipBullet(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > 120 ? `${t.slice(0, 119)}…` : t;
}

async function invokeMBiz(message: string, known?: KnownCompileContext): Promise<SeatInvokeHit | null> {
  const { checkMBizHealth, mbizChat } = await import(
    "@/server/services/m-biz-client"
  );
  const healthy = await checkMBizHealth();
  if (!healthy) return null;
  const response = await mbizChat({
    message,
    enterprise_name: known?.brandName,
    industry: known?.category || "餐饮",
    stage: known?.stage || "经营期",
  });
  if (String(response.status || "") === "degraded") return null;

  const bullets: string[] = [];
  const reply = clipBullet(String(response.reply || ""));
  if (reply && !/暂不可用/.test(reply)) bullets.push(reply.slice(0, 120));

  for (const s of response.suggestions ?? []) {
    const action = clipBullet(String((s as { action?: string }).action || ""));
    if (action) bullets.push(action);
    if (bullets.length >= 5) break;
  }
  for (const q of response.pending_questions ?? []) {
    const t = clipBullet(String(q));
    if (t) bullets.push(`待验证：${t}`);
    if (bullets.length >= 5) break;
  }

  if (bullets.length === 0) return null;
  return {
    bullets: bullets.slice(0, 5),
    nextStep: clipBullet(
      String(
        (response.verification_tasks?.[0] as { verification_action?: string } | undefined)
          ?.verification_action || "",
      ),
    ) || undefined,
    providerTag: "seat.m-biz",
  };
}

async function invokeMPnt(
  message: string,
  projectId: string,
  known: KnownCompileContext | undefined,
  goalTitle: string,
): Promise<SeatInvokeHit | null> {
  const { previewMPntSnapshot } = await import("@/server/services/m-pnt.service");
  const snap = await previewMPntSnapshot({
    message,
    companyContext: companyContext(projectId, known, goalTitle),
  });
  const bullets = [
    clipBullet(String(snap.oneLiner || "")),
    clipBullet(String(snap.diagnosis || "")),
    clipBullet(String(snap.strategy || "")),
    ...(snap.nextSteps || [])
      .slice(0, 2)
      .map((s) =>
        clipBullet(
          typeof s === "string"
            ? s
            : String(
                (s as { title?: string; action?: string }).title ||
                  (s as { action?: string }).action ||
                  "",
              ),
        ),
      ),
  ].filter(Boolean);
  if (bullets.length === 0) return null;
  return {
    bullets: bullets.slice(0, 5),
    nextStep: clipBullet(String(snap.action || "")) || undefined,
    providerTag: "seat.m-pnt",
  };
}

async function invokeMMkt(
  message: string,
  projectId: string,
  known: KnownCompileContext | undefined,
  goalTitle: string,
): Promise<SeatInvokeHit | null> {
  const { previewMMktSnapshot } = await import("@/server/services/m-mkt.service");
  const snap = await previewMMktSnapshot({
    message,
    companyContext: companyContext(projectId, known, goalTitle),
  });
  const bullets = [
    clipBullet(String(snap.oneLiner || "")),
    clipBullet(String(snap.diagnosis || "")),
    clipBullet(String(snap.strategy || "")),
    clipBullet(String(snap.action || "")),
  ].filter(Boolean);
  if (bullets.length === 0) return null;
  const real = /真实引擎/.test(snap.oneLiner || "");
  return {
    bullets: bullets.slice(0, 5),
    nextStep: clipBullet(String(snap.action || "")) || undefined,
    providerTag: real ? "seat.m-mkt.external" : "seat.m-mkt",
  };
}

/**
 * 按 Intent 调单席；超时/失败 → null
 */
export async function invokeSeatForCompile(input: {
  projectId: string;
  output: CompileOutputV1;
  known?: KnownCompileContext;
  fileText?: string;
}): Promise<SeatInvokeHit | null> {
  if (process.env.HEURISTIC_ONLY === "true") return null;
  if (process.env.MOBILE_SEAT_INVOKE === "0") return null;

  const seat = routeSeat(input.output.goal.goalType);
  const message = buildMessage(input.output, input.fileText);
  if (!message.trim()) return null;

  const timeoutMs = Number(process.env.MOBILE_SEAT_TIMEOUT_MS || 12000);

  try {
    if (seat === "m-biz") {
      return await withTimeout(invokeMBiz(message, input.known), timeoutMs);
    }
    if (seat === "m-pnt") {
      return await withTimeout(
        invokeMPnt(
          message,
          input.projectId,
          input.known,
          input.output.goal.title,
        ),
        timeoutMs,
      );
    }
    return await withTimeout(
      invokeMMkt(
        message,
        input.projectId,
        input.known,
        input.output.goal.title,
      ),
      timeoutMs,
    );
  } catch {
    return null;
  }
}

export function routeSeatForIntent(family: IntentFamily) {
  return routeSeat(family);
}
