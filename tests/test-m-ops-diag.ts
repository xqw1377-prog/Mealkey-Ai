/**
 * @mealkey/m-ops-diag Phase1 烟测：mock evidence → signals
 */
import {
  M_OPS_DIAG_AGENT_ID,
  mockDiagnosisRequest,
  diagnoseRestaurantSync,
  runRestaurantDiagnosis,
  mOpsDiagEngine,
  toVerticalInsightSource,
  diagnosisSignalsToWorldHints,
} from "../packages/m-ops-diag/src/index";
import { ToolAgentRegistry } from "../packages/tool-agent-kit/src/index";

let passed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

async function main() {
  const sync = diagnoseRestaurantSync(mockDiagnosisRequest());
  assert(sync.agentId === M_OPS_DIAG_AGENT_ID, "agent id");
  assert(sync.productName === "餐启经营诊断", "product name");
  assert(sync.signals.length >= 1, "has signal (P0)");
  assert(sync.findings.length >= 1, "has finding");
  assert(
    sync.signals[0]!.title.includes("服务") ||
      sync.signals[0]!.severity !== "LOW",
    "service risk signal",
  );
  assert(Boolean(sync.customerLens?.theyThink?.length), "customer lens");
  assert(
    diagnosisSignalsToWorldHints(sync.signals).length >= 1,
    "world hints",
  );

  const result = await runRestaurantDiagnosis(mockDiagnosisRequest());
  assert(result.signals.length === sync.signals.length, "async==sync");

  const insight = toVerticalInsightSource(result, "case-demo");
  assert(Boolean(insight?.findings.length), "insight draft (P1)");

  const empty = diagnoseRestaurantSync(
    mockDiagnosisRequest({ evidence: [] }),
  );
  assert(empty.gaps.some((g) => g.field === "evidence"), "gap when no evidence");

  const reg = new ToolAgentRegistry();
  reg.register(mOpsDiagEngine);
  assert(
    reg.require(M_OPS_DIAG_AGENT_ID).manifest.ports.includes("signal"),
    "registry",
  );

  const toolOut = await mOpsDiagEngine.run({
    agentId: M_OPS_DIAG_AGENT_ID,
    input: mockDiagnosisRequest(),
  });
  assert(Boolean(toolOut.signalHints?.length), "tool port signalHints");

  console.log(`test-m-ops-diag: ${passed} assertions OK`);
}

void main();
