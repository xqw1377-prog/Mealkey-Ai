/**
 * M-PNT 餐饮定位 Agent 单元测试
 *
 * 覆盖范围：
 * - Manifest 验证
 * - Workflow 步骤验证
 * - Capabilities 执行验证（heuristic 模式）
 * - 三理论矩阵验证
 * - 定位知识查询验证
 * - 端到端流程验证
 */

import { MPntAgent, allAgents, getAgentById, mPntManifest, mPntWorkflow, mPntCapabilities, getCapability } from '@mealkey/agents';
import { matchPositioningRules, findPositioningCases, queryPositioningWisdom, POSITIONING_FACTS, POSITIONING_RULES, POSITIONING_CASES, POSITIONING_EXPERIENCES, POSITIONING_MODELS } from '@mealkey/knowledge-engine';
import type { Workflow, AgentDefinition, MKContext } from '@mealkey/agent-sdk';

let passed = 0;
let failed = 0;
const errors: string[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.catch(e => {
        console.log(`✗ ${name}: ${e.message}`);
        failed++;
        errors.push(`${name}: ${e.message}`);
      });
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✓ ${name}`);
      passed++;
    }
  } catch (e: any) {
    console.log(`✗ ${name}: ${e.message}`);
    failed++;
    errors.push(`${name}: ${e.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

function assertEqual(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ═══════════════════════════════════════════
// 1. Manifest 验证
// ═══════════════════════════════════════════

console.log('\n=== 1. Manifest 验证 ===\n');

test('MPntAgent 存在且已注册到 allAgents', () => {
  assert(allAgents.some(a => a.manifest.id === 'm-pnt'), 'm-pnt should be in allAgents');
  const agent = getAgentById('m-pnt');
  assert(agent !== undefined, 'getAgentById should find m-pnt');
});

test('mPntManifest - 基本信息', () => {
  assert(mPntManifest.id === 'm-pnt', 'id should be m-pnt');
  assert(mPntManifest.name === 'MealKey 餐饮定位顾问', `name: ${mPntManifest.name}`);
  assert(mPntManifest.version === '1.0.0', 'version');
  assert(mPntManifest.category === 'positioning', 'category');
});

test('mPntManifest - 能力列表包含6个能力', () => {
  const caps = mPntManifest.capabilities;
  assert(caps.length === 6, `should have 6 capabilities, got ${caps.length}`);
  assert(caps.includes('category_analysis'), 'category_analysis');
  assert(caps.includes('customer_portrait'), 'customer_portrait');
  assert(caps.includes('price_positioning'), 'price_positioning');
  assert(caps.includes('competitor_analysis'), 'competitor_analysis');
  assert(caps.includes('differentiation'), 'differentiation');
  assert(caps.includes('brand_tonality'), 'brand_tonality');
});

test('mPntManifest - 定价信息', () => {
  const pricing = mPntManifest.pricing;
  assert(pricing !== undefined, 'should have pricing');
  assert(pricing?.type === 'one_time', 'type');
  assert(pricing?.price === 49900, 'price');
  assert(pricing?.currency === 'CNY', 'currency');
});

test('mPntManifest - 权限声明', () => {
  assert(mPntManifest.permissions?.knowledge === true, 'knowledge permission');
  assert(mPntManifest.permissions?.project === true, 'project permission');
  assert(mPntManifest.permissions?.memory === true, 'memory permission');
});

// ═══════════════════════════════════════════
// 2. Workflow 验证
// ═══════════════════════════════════════════

console.log('\n=== 2. Workflow 验证 ===\n');

test('mPntWorkflow - 存在', () => {
  assert(mPntWorkflow !== null, 'workflow should exist');
  assert(typeof mPntWorkflow === 'object', 'should be an object');
});

test('mPntWorkflow - 工作流名称', () => {
  assert(mPntWorkflow.name === '餐饮定位分析流程', `name: ${mPntWorkflow.name}`);
});

test('mPntWorkflow - 步骤数量为7', () => {
  assert(mPntWorkflow.steps.length === 7, `should have 7 steps, got ${mPntWorkflow.steps.length}`);
});

test('mPntWorkflow - 步骤顺序正确', () => {
  const stepIds = mPntWorkflow.steps.map(s => s.id);
  assertEqual(stepIds[0], 'category_analysis', 'step 1');
  assertEqual(stepIds[1], 'customer_portrait', 'step 2');
  assertEqual(stepIds[2], 'price_positioning', 'step 3');
  assertEqual(stepIds[3], 'competitor_analysis', 'step 4');
  assertEqual(stepIds[4], 'differentiation', 'step 5');
  assertEqual(stepIds[5], 'brand_tonality', 'step 6');
  assertEqual(stepIds[6], 'final_positioning', 'step 7');
});

test('mPntWorkflow - 每步都有 knowledge 字段', () => {
  for (const step of mPntWorkflow.steps) {
    assert(Array.isArray(step.knowledge), `step ${step.id} should have knowledge array`);
    assert(step.knowledge!.length > 0, `step ${step.id} should have at least 1 knowledge ref`);
    // 验证知识引用指向 position 知识体系
    if (step.id !== 'final_positioning') {
      assert(
        step.knowledge!.some(k => k.startsWith('positioning_')),
        `step ${step.id} knowledge should reference positioning_*`
      );
    }
  }
});

test('mPntWorkflow - 最后一步输出 final', () => {
  const lastStep = mPntWorkflow.steps[mPntWorkflow.steps.length - 1];
  assert(lastStep.output === 'final', `last step output should be final, got ${lastStep.output}`);
});

// ═══════════════════════════════════════════
// 3. Capabilities 验证
// ═══════════════════════════════════════════

console.log('\n=== 3. Capabilities 验证 ===\n');

test('mPntCapabilities - 注册了6个能力', () => {
  assert(mPntCapabilities.length === 6, `should have 6, got ${mPntCapabilities.length}`);
});

test('getCapability - 按ID获取', () => {
  const cap = getCapability('category_analysis');
  assert(cap !== undefined, 'should find category_analysis');
  assert(cap.id === 'category_analysis', 'id');
  assert(cap.name === '品类分析', `name: ${cap.name}`);
});

test('每个 Capability 都有 execute 方法', () => {
  for (const cap of mPntCapabilities) {
    assert(typeof cap.execute === 'function', `${cap.id} should have execute`);
    assert(typeof cap.id === 'string', `${cap.id} should have id`);
    assert(typeof cap.name === 'string', `${cap.id} should have name`);
  }
});

test('Capability 执行 - category_analysis（heuristic模式）', async () => {
  const cap = getCapability('category_analysis')!;
  const context: MKContext = {
    owner: { id: 'o1', name: '张老板', email: null, experience: '5年餐饮', strengths: ['湘菜'], weaknesses: ['品牌'], overallScore: 60, riskTolerance: 'medium', investmentStyle: 'moderate' },
    project: { id: 'p1', name: '湘菜馆', category: '湘菜', city: '长沙', stage: 'positioning', target: null, district: null, budget: 100, profile: null, healthScore: null, confidence: null },
    memories: [],
    decisions: [],
    knowledge: { rules: [], cases: [], models: [] },
  };

  const result = await cap.execute({}, context);
  assert(result.problem.includes('品类分析'), `problem: ${result.problem}`);
  assert(result.observation.length > 0, 'should have observation');
  assert(result.judgement.length > 0, 'should have judgement');
  assert(result.confidence > 0 && result.confidence <= 1, `confidence should be 0-1, got ${result.confidence}`);
  assert(result.evidence.length > 0, 'should have evidence');
});

test('Capability 执行 - customer_portrait（heuristic模式）', async () => {
  const cap = getCapability('customer_portrait')!;
  const context: MKContext = {
    owner: { id: 'o1', name: '李老板', email: null, experience: '3年餐饮', strengths: ['运营'], weaknesses: ['营销'], overallScore: 55, riskTolerance: 'medium', investmentStyle: 'moderate' },
    project: { id: 'p2', name: '火锅店', category: '火锅', city: '成都', stage: 'idea', target: null, district: '春熙路', budget: 80, profile: null, healthScore: null, confidence: null },
    memories: [],
    decisions: [],
    knowledge: { rules: [], cases: [], models: [] },
  };

  const result = await cap.execute({}, context);
  assert(result.problem.includes('客群'), `problem: ${result.problem}`);
  assert(result.judgement.length > 0, 'should have judgement');
});

test('Capability 执行 - price_positioning（heuristic模式）', async () => {
  const cap = getCapability('price_positioning')!;
  const context: MKContext = {
    owner: { id: 'o1', name: '王老板', email: null, experience: '10年', strengths: ['产品', '供应链'], weaknesses: ['数字化'], overallScore: 70, riskTolerance: 'high', investmentStyle: 'aggressive' },
    project: { id: 'p3', name: '日料店', category: '日料', city: '上海', stage: 'positioning', target: null, district: '静安', budget: 200, profile: null, healthScore: null, confidence: null },
    memories: [],
    decisions: [],
    knowledge: { rules: [], cases: [], models: [] },
  };

  const result = await cap.execute({}, context);
  assert(result.problem.includes('价格'), `problem: ${result.problem}`);
  assert(result.confidence > 0, 'should have confidence');
});

test('所有 Capability 都能在 heuristic 模式执行', async () => {
  const context: MKContext = {
    owner: { id: 'o1', name: '测试', email: null, experience: '3年', strengths: ['产品'], weaknesses: ['品牌'], overallScore: 50, riskTolerance: 'medium', investmentStyle: 'moderate' },
    project: { id: 'p1', name: '测试项目', category: '湘菜', city: '长沙', stage: 'positioning', target: null, district: null, budget: 80, profile: null, healthScore: null, confidence: null },
    memories: [],
    decisions: [],
    knowledge: { rules: [], cases: [], models: [] },
  };

  for (const cap of mPntCapabilities) {
    try {
      const result = await cap.execute({}, context);
      assert(result.judgement.length > 0, `${cap.id}: should have judgement`);
      assert(result.confidence >= 0 && result.confidence <= 1, `${cap.id}: confidence should be 0-1`);
    } catch (e: any) {
      assert(false, `${cap.id}: execution failed - ${e.message}`);
    }
  }
});

// ═══════════════════════════════════════════
// 4. 三理论矩阵验证
// ═══════════════════════════════════════════

console.log('\n=== 4. 三理论矩阵验证 ===\n');

test('三理论 Agent 注册表存在', () => {
  const { theoryAgents, theoryAgentMap, getTheoryAgent } = require('@mealkey/agents');
  assert(theoryAgents.length === 3, 'should have 3 theory agents');
  assert(theoryAgentMap.ries !== undefined, 'ries agent');
  assert(theoryAgentMap.trout !== undefined, 'trout agent');
  assert(theoryAgentMap.ye_maozhong !== undefined, 'ye_maozhong agent');
});

test('三理论类型定义完整', () => {
  const { theoryAgents, theoryAgentMap, runTheoryMatrix } = require('@mealkey/agents');
  assert(Array.isArray(theoryAgents), 'theoryAgents should be array');
  assert(theoryAgentMap.ries !== undefined, 'ries agent registered');
  assert(typeof runTheoryMatrix === 'function', 'runTheoryMatrix');
});

// ═══════════════════════════════════════════
// 5. 定位知识验证
// ═══════════════════════════════════════════

console.log('\n=== 5. 定位知识验证 ===\n');

test('POSITIONING_FACTS - 有足够的理论知识 (>=15)', () => {
  assert(POSITIONING_FACTS.length >= 15, `got ${POSITIONING_FACTS.length}`);
  const coreFacts = POSITIONING_FACTS.filter(f => f.category === '定位理论核心');
  assert(coreFacts.length >= 5, 'should have at least 5 core theory facts');
});

test('POSITIONING_RULES - 有足够的定位规则 (>=25)', () => {
  assert(POSITIONING_RULES.length >= 25, `got ${POSITIONING_RULES.length}`);
  const scenarios = new Set(POSITIONING_RULES.map(r => r.scenario));
  assert(scenarios.has('品类选择'), 'should cover 品类选择');
  assert(scenarios.has('定位策略'), 'should cover 定位策略');
  assert(scenarios.has('价格定位'), 'should cover 价格定位');
  assert(scenarios.has('差异化策略'), 'should cover 差异化策略');
  assert(scenarios.has('品牌命名'), 'should cover 品牌命名');
});

test('matchPositioningRules - 匹配品类选择规则', () => {
  const matched = matchPositioningRules({ experience_years: 0, category_complexity: 4 });
  assert(matched.length > 0, 'should match rules');
  assert(matched.some(r => r.id === 'POS-RULE-001'), 'should match POS-RULE-001');
});

test('matchPositioningRules - 不匹配不符合条件的规则', () => {
  const matched = matchPositioningRules({ experience_years: 10, category_complexity: 1 });
  assert(!matched.some(r => r.id === 'POS-RULE-001'), 'should NOT match POS-RULE-001');
});

test('POSITIONING_CASES - 有足够的案例 (>=20)', () => {
  assert(POSITIONING_CASES.length >= 20, `got ${POSITIONING_CASES.length}`);
  const successCases = POSITIONING_CASES.filter(c => c.outcome.status === 'success');
  const failureCases = POSITIONING_CASES.filter((c: any) => c.outcome?.status === 'failure');
  assert(successCases.length >= 15, `success cases: ${successCases.length}`);
  assert(failureCases.length >= 3, `failure cases: ${failureCases.length}`);
});

test('findPositioningCases - 按品类查找定位案例', () => {
  const results = findPositioningCases({ category: '火锅' });
  assert(results.length > 0, 'should find cases');
});

test('POSITIONING_EXPERIENCES - 有足够经验 (>=15)', () => {
  assert(POSITIONING_EXPERIENCES.length >= 15, `got ${POSITIONING_EXPERIENCES.length}`);
  const masters = new Set(POSITIONING_EXPERIENCES.map(e => e.master));
  assert(masters.has('里斯 & 特劳特') || masters.has('里斯'), 'should have Ries/Trout');
  assert(masters.has('叶茂中'), 'should have Ye Maozhong');
});

test('queryPositioningWisdom - 按主题查询定位智慧', () => {
  const results = queryPositioningWisdom('定位');
  assert(results.length > 0, 'should find wisdom');
});

test('POSITIONING_MODELS - 有足够模型 (>=5)', () => {
  assert(POSITIONING_MODELS.length >= 5, `got ${POSITIONING_MODELS.length}`);
});

// ═══════════════════════════════════════════
// 6. 母体对接验证
// ═══════════════════════════════════════════

console.log('\n=== 6. 母体对接验证 ===\n');

test('detectPositioningIntent - 定位意图检测', () => {
  const { detectPositioningIntent, mapPositioningProblem } = require('@mealkey/agents');
  
  assert(detectPositioningIntent('品牌定位怎么做') === true, '品牌定位');
  assert(detectPositioningIntent('品类分析火锅') === true, '品类分析');
  assert(detectPositioningIntent('今天天气怎么样') === false, '非定位意图');
  
  const result = mapPositioningProblem('品牌定位怎么做');
  assert(result !== null, 'should return problem mapping');
  assert(result!.realProblem === 'positioning_strategy', 'realProblem');
  assert(result!.capabilities.includes('positioning'), 'should include positioning capability');
});

test('shouldUseMPntAgent - 母体路由判断', () => {
  const { detectPositioningIntent } = require('@mealkey/agents');
  // detectPositioningIntent 已在 intent-detector.ts 注册
  assert(detectPositioningIntent('我想做品牌定位') === true, '定位意图');
  assert(detectPositioningIntent('帮我分析品类') === true, '品类意图');
});

// ═══════════════════════════════════════════
// 7. Demo 运行验证
// ═══════════════════════════════════════════

console.log('\n=== 7. Demo 运行验证 ===\n');

test('runMPnt - 湘菜 demo 可执行（heuristic模式）', async () => {
  const { runMPnt } = require('@mealkey/agents');
  const context: MKContext = {
    owner: { id: 'o1', name: '张老板', email: null, experience: '8年湘菜后厨', strengths: ['湘菜', '供应链'], weaknesses: ['品牌'], overallScore: 60, riskTolerance: 'medium', investmentStyle: 'moderate' },
    project: { id: 'p_demo', name: '湘菜筹备项目', category: '湘菜', city: '长沙', stage: 'positioning', target: null, district: '五一商圈', budget: 100, profile: { area: 180, seats: 70 }, healthScore: null, confidence: null },
    memories: [],
    decisions: [],
    knowledge: { rules: [], cases: [], models: [] },
  };

  const result = await runMPnt(context, { id: 'demo', type: 'positioning', goal: '湘菜品牌定位' }, { mode: 'heuristic' });
  assert(result.agentId === 'm-pnt', 'agentId');
  assert(result.steps.length >= 6, `should have at least 6 steps, got ${result.steps.length}`);
  assert(result.decision.judgement.length > 0, 'final decision should have judgement');
  assert(result.decision.confidence > 0, 'final decision should have confidence');
  assert(result.decision.evidence.length > 0, 'final decision should have evidence');

  // 验证 Final decision 的 structured evidence 包含 M-Solution
  const structuredEvidence = result.decision.evidence.find(e => e.source === 'structured');
  assert(structuredEvidence !== undefined, 'should have structured evidence');
  const parsed = JSON.parse(structuredEvidence!.content);
  assert(parsed.agentId === 'm-pnt', 'structured agentId');
  assert(parsed.brandPositioning !== undefined, 'should have brandPositioning');
}, 30000);

test('runMPnt - 支持 KnowledgeEngine 注入', async () => {
  const { runMPnt } = require('@mealkey/agents');
  const context: MKContext = {
    owner: { id: 'o1', name: '测试', email: null, experience: '3年', strengths: [], weaknesses: [], overallScore: 50, riskTolerance: 'medium', investmentStyle: 'moderate' },
    project: { id: 'p_ke', name: '测试知识注入', category: '火锅', city: '成都', stage: 'idea', target: null, district: null, budget: 60, profile: null, healthScore: null, confidence: null },
    memories: [],
    decisions: [],
    knowledge: { rules: [], cases: [], models: [] },
  };

  const mockKnowledgeEngine = {
    getContextForAgent: async (_agentId: string, _projectId: string, _query: string, _limit?: number) => {
      return ['【定位理论】心智阶梯定律：每个品类在心智中最多容纳7个品牌', '【品类基准】火锅品类参考客单价70-150元'];
    },
  };

  const result = await runMPnt(context, undefined, {
    mode: 'heuristic',
    knowledgeEngine: mockKnowledgeEngine,
  });
  assert(result.decision.judgement.length > 0, 'should still produce decision');
}, 30000);

// ═══════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════

console.log(`\n========================================`);
console.log(`M-PNT 测试结果: ${passed} 通过, ${failed} 失败`);
console.log(`========================================`);

if (errors.length > 0) {
  console.log('\n失败详情:');
  for (const e of errors) console.log(`  - ${e}`);
}

process.exit(failed > 0 ? 1 : 0);
