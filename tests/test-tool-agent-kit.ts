/**
 * @mealkey/tool-agent-kit 烟测
 */
import {
  ToolAgentRegistry,
  assertPipeline,
  assertFanInForCouncil,
  assertPurposePorts,
  type ToolAgentEngine,
  type ToolAgentManifest,
} from "../packages/tool-agent-kit/src/index";

function makeEngine(
  partial: Partial<ToolAgentManifest> & Pick<ToolAgentManifest, "id">,
): ToolAgentEngine {
  const manifest: ToolAgentManifest = {
    id: partial.id,
    name: partial.name || partial.id,
    version: partial.version || "0.1.0",
    kind: partial.kind || "ops",
    stage: partial.stage || "pilot",
    ports: partial.ports || ["signal", "gap"],
    permissions: partial.permissions || ["EMIT_SIGNAL"],
    inputSchemaRef: "test.input",
    outputSchemaRef: "test.output",
    invokePolicy: partial.invokePolicy || {
      requiresDecisionAuth: false,
      requiresBossConfirm: false,
      billable: false,
    },
    compose: partial.compose,
  };
  return {
    manifest,
    async run(req) {
      return { agentId: req.agentId, ok: true, gaps: [] };
    },
  };
}

let passed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

const reg = new ToolAgentRegistry();
reg.register(
  makeEngine({
    id: "l3.ops.diag",
    ports: ["signal", "insight", "gap"],
    compose: { downstream: ["l3.menu.margin"] },
  }),
);
reg.register(
  makeEngine({
    id: "l3.menu.margin",
    kind: "menu",
    ports: ["work", "insight", "gap"],
    compose: { upstream: ["l3.ops.diag"] },
  }),
);

assert(reg.list().length === 2, "list size");
assert(reg.list({ kind: "ops" }).length === 1, "filter kind");
assertPurposePorts(reg.require("l3.ops.diag").manifest, "radar");
assertPipeline(reg, ["l3.ops.diag", "l3.menu.margin"]);
assertFanInForCouncil(reg, ["l3.ops.diag", "l3.menu.margin"]);

let rejected = false;
try {
  reg.register(makeEngine({ id: "bad_id", ports: ["signal"] }));
} catch {
  rejected = true;
}
assert(rejected, "bad id rejected");

reg.register(
  makeEngine({
    id: "m-ops-diag",
    kind: "ops",
    ports: ["signal", "insight", "gap"],
  }),
);
assert(Boolean(reg.get("m-ops-diag")), "m-ops-* id accepted");

async function main() {
  const result = await reg.require("l3.ops.diag").run({
    agentId: "l3.ops.diag",
    input: {},
  });
  assert(result.ok === true, "engine run");
  console.log(`test-tool-agent-kit: ${passed} assertions OK`);
}

void main();
