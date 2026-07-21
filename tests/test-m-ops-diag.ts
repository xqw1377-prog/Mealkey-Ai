/**
 * @mealkey/m-ops-diag Phase1 烟测：mock evidence → signals
 */
import {
  M_OPS_DIAG_AGENT_ID,
  mockDiagnosisRequest,
  runRestaurantDiagnosis,
  mOpsDiagEngine,
  toVerticalInsightSource,
} from "../packages/m-ops-diag/src/index";
import { ToolAgentRegistry } from "../packages/tool-agent-kit/src/index";

let passed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

async function main() {
  const result = await runRestaurantDiagnosis(mockDiagnosisRequest());
  assert(result.agentId === M_OPS_DIAG_AGENT_ID, "agent id");
  assert(result.productName === "餐启经营诊断", "product name");
  assert(result.signals.length >= 1, "has signal (P0)");
  assert(result.findings.length >= 1, "has finding");
  assert(result.signals[0]!.title.includes("服务") || result.signals[0]!.severity !== "LOW", "service risk signal");
  assert(Boolean(result.customerLens?.theyThink?.length), "customer lens");

  const insight = toVerticalInsightSource(result, "case-demo");
  assert(Boolean(insight?.findings.length), "insight draft (P1)");

  const empty = await runRestaurantDiagnosis(
    mockDiagnosisRequest({ evidence: [] }),
  );
  assert(empty.gaps.some((g) => g.field === "evidence"), "gap when no evidence");

  const reg = new ToolAgentRegistry();
  reg.register(mOpsDiagEngine);
  assert(reg.require(M_OPS_DIAG_AGENT_ID).manifest.ports.includes("signal"), "registry");

  const toolOut = await mOpsDiagEngine.run({
    agentId: M_OPS_DIAG_AGENT_ID,
    input: mockDiagnosisRequest(),
  });
  assert(Boolean(toolOut.signalHints?.length), "tool port signalHints");

  console.log(`test-m-ops-diag: ${passed} assertions OK`);
}

void main();
