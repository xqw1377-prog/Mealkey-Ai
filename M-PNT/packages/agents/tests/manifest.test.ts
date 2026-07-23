import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mPntManifest, mPntCapabilities, mPntWorkflow } from "../src/m-pnt/index.ts";

describe("m-pnt manifest", () => {
  it("has required identity fields", () => {
    assert.equal(mPntManifest.id, "m-pnt");
    assert.ok(mPntManifest.name.includes("定位"));
    assert.equal(mPntManifest.version, "1.0.0");
    assert.equal(mPntManifest.category, "positioning");
  });

  it("lists six capabilities matching registry", () => {
    assert.equal(mPntManifest.capabilities.length, 6);
    const ids = mPntCapabilities.map((c) => c.id).sort();
    assert.deepEqual([...mPntManifest.capabilities].sort(), ids);
  });

  it("enables knowledge/project/memory permissions", () => {
    assert.equal(mPntManifest.permissions?.knowledge, true);
    assert.equal(mPntManifest.permissions?.project, true);
    assert.equal(mPntManifest.permissions?.memory, true);
  });
});

describe("m-pnt workflow", () => {
  it("has seven steps ending in final decision", () => {
    assert.equal(mPntWorkflow.steps.length, 7);
    const last = mPntWorkflow.steps[mPntWorkflow.steps.length - 1];
    assert.equal(last.id, "final_positioning");
    assert.equal(last.output, "final");
    assert.equal(last.type, "decision");
  });

  it("chains next pointers correctly", () => {
    for (let i = 0; i < mPntWorkflow.steps.length - 1; i++) {
      assert.equal(
        mPntWorkflow.steps[i].next,
        mPntWorkflow.steps[i + 1].id,
        `step ${mPntWorkflow.steps[i].id} next`,
      );
    }
  });

  it("embeds three-theory matrix in differentiation + final prompts", () => {
    const diff = mPntWorkflow.steps.find((s) => s.id === "differentiation");
    const final = mPntWorkflow.steps.find((s) => s.id === "final_positioning");
    assert.ok(diff?.prompt?.includes("Ries"));
    assert.ok(diff?.prompt?.includes("Trout"));
    assert.ok(diff?.prompt?.includes("叶茂中") || diff?.prompt?.includes("Ye"));
    assert.ok(final?.prompt?.includes("Cross-Fire"));
    assert.ok(final?.prompt?.includes("decision_recommend"));
    assert.ok(final?.prompt?.includes("mSolution"));
  });
});
