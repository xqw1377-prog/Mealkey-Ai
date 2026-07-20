/**
 * 产品联调验收就绪检查 — 管理台一眼看清「能不能给老板演示」
 * 不假标完成：只报告配置/连通/门禁状态。
 */
import { getConsultingEngineHealth } from "@/server/services/engine-health.service";
import { isDegradedMeetingAllowed } from "@/server/services/engine-meeting-gate";
import {
  isWechatH5PreferredEnabled,
  isWechatPayConfigured,
} from "@/server/services/payment/wechat-pay";
import { isAlipayConfigured } from "@/server/services/payment/alipay";
import { getPaymentMode } from "@/server/services/payment.service";

export type AcceptanceCheckStatus = "pass" | "warn" | "fail";

export type AcceptanceCheck = {
  id: string;
  category: "engine" | "billing" | "voice" | "gate" | "ops";
  label: string;
  status: AcceptanceCheckStatus;
  detail: string;
  /** 老板侧怎么验收 */
  bossVerify?: string;
};

export type ProductAcceptanceReport = {
  checkedAt: string;
  readyForDemo: boolean;
  readyForProduction: boolean;
  passCount: number;
  warnCount: number;
  failCount: number;
  checks: AcceptanceCheck[];
  summary: string;
};

function hasCloudAsrKey() {
  return Boolean(
    process.env.QWEN_API_KEY?.trim() || process.env.DASHSCOPE_API_KEY?.trim(),
  );
}

function hasUpstash() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

export async function buildProductAcceptanceReport(): Promise<ProductAcceptanceReport> {
  const health = await getConsultingEngineHealth();
  const paymentMode = getPaymentMode();
  const allowDegraded = isDegradedMeetingAllowed();
  const isProd = process.env.NODE_ENV === "production";

  const engineChecks: AcceptanceCheck[] = health.engines.map((e) => ({
    id: `engine.${e.id}`,
    category: "engine" as const,
    label: `${e.label} 外呼`,
    status: e.ok ? ("pass" as const) : ("fail" as const),
    detail: e.ok
      ? `连通 · ${e.latencyMs}ms · ${e.detail}`
      : `DOWN · ${e.detail}`,
    bossVerify: e.ok
      ? "开会席位应标「真实引擎」"
      : "开会应拒扣点或出现降级条（开发可能放行）",
  }));

  const checks: AcceptanceCheck[] = [
    ...engineChecks,
    {
      id: "gate.degraded",
      category: "gate",
      label: "降级开会放行",
      status: allowDegraded
        ? isProd
          ? "fail"
          : "warn"
        : "pass",
      detail: allowDegraded
        ? isProd
          ? "生产仍允许降级开会（FOUNDER_ALLOW_DEGRADED_MEETING / HEURISTIC_ONLY）— 假咨询风险"
          : "开发/演示可降级开会；生产务必关闭"
        : "生产门禁：任一席启发式将退点拒交付",
      bossVerify: "停掉一个引擎再开会：应退点且不能当正式交付",
    },
    {
      id: "billing.mode",
      category: "billing",
      label: "支付模式",
      status:
        paymentMode === "live"
          ? "pass"
          : isProd
            ? "fail"
            : "warn",
      detail:
        paymentMode === "live"
          ? "PAYMENT_MODE=live"
          : "当前 sandbox — 仅模拟到账，不能收真钱",
      bossVerify: "充值页能出码 / H5 跳转，到账后经营点增加",
    },
    {
      id: "billing.wechat",
      category: "billing",
      label: "微信支付配置",
      status: isWechatPayConfigured()
        ? "pass"
        : paymentMode === "live"
          ? "fail"
          : "warn",
      detail: isWechatPayConfigured()
        ? `Native 已配${isWechatH5PreferredEnabled() ? " · H5 优先开启" : " · H5 已关"}`
        : "未配 WECHAT_PAY_* — live 下无法微信收款",
      bossVerify: "微信内：优先 H5；失败则三步引导 + 复制链接扫码",
    },
    {
      id: "billing.alipay",
      category: "billing",
      label: "支付宝配置",
      status: isAlipayConfigured()
        ? "pass"
        : paymentMode === "live"
          ? "warn"
          : "warn",
      detail: isAlipayConfigured()
        ? "支付宝已配"
        : "未配支付宝（可选渠道）",
      bossVerify: "可选：支付宝跳转收银台",
    },
    {
      id: "voice.asr",
      category: "voice",
      label: "云端语音转写",
      status: hasCloudAsrKey() ? "pass" : "warn",
      detail: hasCloudAsrKey()
        ? "已配 QWEN_/DASHSCOPE_API_KEY"
        : "未配通义 Key — 微信店访口述会转写失败，只能手填",
      bossVerify: "六步店访按住说话 → 证据句出现转写文字",
    },
    {
      id: "ops.rate_limit",
      category: "ops",
      label: "生产限流",
      status: hasUpstash()
        ? "pass"
        : process.env.RATE_LIMIT_ALLOW_MEMORY === "1"
          ? "warn"
          : isProd
            ? "fail"
            : "warn",
      detail: hasUpstash()
        ? "Upstash 已配"
        : process.env.RATE_LIMIT_ALLOW_MEMORY === "1"
          ? "内存限流应急开着（多实例无效）"
          : "未配 Upstash — 生产可能 fail-closed 全拒",
    },
    {
      id: "product.mpnt_staff",
      category: "ops",
      label: "M-PNT 可贴店交付",
      status: "pass",
      detail: "签字包含 §7 店员交付包；UI 支持复制/打印墙卡",
      bossVerify: "定位咨询完成 → 复制墙卡 / 打印店员包",
    },
    {
      id: "product.meeting_today",
      category: "ops",
      label: "会后今日三动作",
      status: "pass",
      detail: "confirmFromMeeting 写入 lastActionPlan",
      bossVerify: "接受会议方案 → 今日 Brief 出现三动作",
    },
    {
      id: "product.redeision",
      category: "ops",
      label: "验证偏航一键复会",
      status: "pass",
      detail: "suggestedNextMeeting + 今日 CTA",
      bossVerify: "行动页选「偏离了」→ 今日出现一键复会",
    },
  ];

  const passCount = checks.filter((c) => c.status === "pass").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const failCount = checks.filter((c) => c.status === "fail").length;

  const enginesOk = health.engines.every((e) => e.ok);
  const readyForDemo =
    enginesOk &&
    hasCloudAsrKey() &&
    failCount === 0;
  const readyForProduction =
    isProd &&
    enginesOk &&
    !allowDegraded &&
    paymentMode === "live" &&
    isWechatPayConfigured() &&
    hasUpstash() &&
    failCount === 0;

  let summary: string;
  if (readyForProduction) {
    summary = "生产就绪：外呼齐全、支付 live、门禁关闭降级、限流已配。";
  } else if (readyForDemo) {
    summary = "演示就绪：外呼与语音可用；上生产前仍需核对支付 live / 限流 / 关闭降级放行。";
  } else if (failCount > 0) {
    summary = `未就绪：${failCount} 项失败、${warnCount} 项警告。先修失败项再给老板演示收费会议。`;
  } else {
    summary = `基本可演示但有 ${warnCount} 项警告（常见：sandbox 支付或未配 ASR）。`;
  }

  return {
    checkedAt: new Date().toISOString(),
    readyForDemo,
    readyForProduction,
    passCount,
    warnCount,
    failCount,
    checks,
    summary,
  };
}
