import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allAgents, MPntAgent } from "../src/index.ts";
import { M_PNT_SYSTEM_PROMPT } from "../src/m-pnt/prompts/system.ts";
import { mPntReportTemplate } from "../src/m-pnt/reports/template.ts";
import { mPntKnowledgeSeeds } from "../src/m-pnt/knowledge/seeds.ts";

describe("agent registration", () => {
  it("exports MPntAgent in allAgents", () => {
    assert.equal(allAgents.length, 1);
    assert.equal(allAgents[0].manifest.id, "m-pnt");
    assert.equal(MPntAgent.capabilities.length, 6);
    assert.ok(MPntAgent.prompt.includes("三理论"));
  });

  it("system prompt and report template are present", () => {
    assert.ok(M_PNT_SYSTEM_PROMPT.includes("MKDecision"));
    assert.equal(mPntReportTemplate.sections.length, 7);
    assert.ok(mPntKnowledgeSeeds.length >= 4);
  });
});
