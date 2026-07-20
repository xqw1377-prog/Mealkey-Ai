import { describe, expect, it } from "vitest";
import { checkMBizHealth, mbizChat } from "@/server/services/m-biz-client";
import { checkMEdHealth, medEquity, buildDefaultEquityPayload } from "@/server/services/m-ed-client";
import { checkMMktHealth, mmktAnalyze } from "@/server/services/m-mkt-client";
import { runFounderLoop } from "@/server/founder-layer";

/**
 * 真实引擎联调（可选）
 *
 * 默认跳过。启动引擎后：
 *   LIVE_AGENTS=1 npx vitest run tests/founder-live-agents.smoke.test.ts
 *
 * 环境变量：
 *   MBIZ_API_BASE_URL=http://127.0.0.1:8010/api/v1/bmjm   # 8000 被占用时用 8010
 *   MBIZ_API_TOKEN=mbiz-dev-token-2026
 *   MED_API_BASE_URL=http://127.0.0.1:8001
 *   MMKT_API_BASE_URL=http://127.0.0.1:8002
 */
const LIVE = process.env.LIVE_AGENTS === "1";
const TIMEOUT = 90000;

describe.skipIf(!LIVE)("Live agents smoke", () => {
  it(
    "三席 HTTP 健康检查",
    async () => {
      const [biz, ed, mkt] = await Promise.all([
        checkMBizHealth(),
        checkMEdHealth(),
        checkMMktHealth(),
      ]);
      expect({ biz, ed, mkt }).toEqual({ biz: true, ed: true, mkt: true });
    },
    TIMEOUT,
  );

  it(
    "M-MKT / M-ED / M-BIZ 单席可调用",
    async () => {
      const mkt = await mmktAnalyze({
        category: "湘菜",
        city: "长沙",
        message: "长沙湘菜宴请是否值得进入",
        mode: "light",
      });
      expect(mkt.category || mkt.opportunity_level || mkt.engine).toBeTruthy();

      const ed = await medEquity({
        user_id: "live-smoke",
        action: "design_equity",
        payload: buildDefaultEquityPayload({
          projectName: "飞轮湘菜",
          stage: "seed",
          message: "股权设计",
        }),
      });
      expect(ed.status === "success" || Boolean(ed.data)).toBe(true);

      const biz = await mbizChat(
        {
          message: "3家直营湘菜，是否开放加盟到20家？",
          enterprise_name: "飞轮湘菜",
          industry: "food_service",
          stage: "seed",
        },
        { timeoutMs: 25000 },
      );
      expect(biz.reply || biz.status).toBeTruthy();
      expect(biz.status).not.toBe("degraded");
    },
    TIMEOUT,
  );

  it(
    "Founder Loop 至少 M-MKT/M-ED/M-BIZ 走真实引擎标记",
    async () => {
      process.env.HEURISTIC_ONLY = "false";
      const result = await runFounderLoop({
        request: {
          requestId: "req-live-1",
          projectId: "proj-live-1",
          userId: "user-live-1",
          message: "马上开放加盟，90天开到20家可以吗？",
          companyContext: {
            companyId: "proj-live-1",
            basicInfo: {
              name: "飞轮湘菜",
              industry: "湘菜",
              city: "长沙",
              stage: "扩张前",
            },
            brand: {
              name: "飞轮湘菜",
              positioning: "长沙宴请湘菜",
              users: "商务宴请",
            },
            business: { scale: "3 家直营" },
            goals: ["稳健扩张"],
          },
          createdAt: new Date().toISOString(),
        },
      });

      expect(result.decisions).toHaveLength(4);
      const byAgent = Object.fromEntries(
        result.decisions.map((d) => [d.sourceAgent, d.metadata?.provider || "unknown"]),
      );
      // M-PNT 进程内可算 external 或未标；外呼三席应尽量 external
      expect(byAgent["M-MKT"]).toBe("external");
      expect(byAgent["M-ED"]).toBe("external");
      expect(byAgent["M-BIZ"]).toBe("external");
      expect(result.meeting.debateSession?.challenges.every((c) => c.targetEvidenceId)).toBe(
        true,
      );
      expect(["带条件推进", "暂缓推进"]).toContain(result.finalDecision.chosen);
    },
    TIMEOUT,
  );
});
