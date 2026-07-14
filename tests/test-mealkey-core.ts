/**
 * MealKey Core 单元测试
 *
 * 覆盖范围：核心模块数据验证 + 逻辑测试
 * 使用 dist 编译产物验证
 */

import {
  detectLaunchIntent, shouldUseLaunchAgent,
  DECISION_RULES, matchRules,
  CASE_STUDIES, findSimilarCases,
  BUSINESS_MODELS, findModelsByScenario, findModelById,
  MASTER_EXPERIENCES, queryMasterWisdom,
  getAllFrameworks, getFramework, recommendFramework,
  RESTAURANT_SUCCESS_FRAMEWORK,
  DefaultRiskAnalyzer,
  ChallengeEngine,
  STAGES, TRANSITIONS, LifecycleManager,
  LLMCache,
  ChiefToolRegistry,
} from '@mealkey/core';

// ═══════════════════════════════════════════════
// Test Runner
// ═══════════════════════════════════════════════

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

// ═══════════════════════════════════════════════
// 1. KnowledgeEngine 数据验证
// ═══════════════════════════════════════════════

console.log('\n=== 1. KnowledgeEngine 数据验证 ===\n');

test('DECISION_RULES - 有足够的规则覆盖 (>=40)', () => {
  assert(DECISION_RULES.length >= 40, `got ${DECISION_RULES.length}`);
  
  const scenarios = new Set(DECISION_RULES.map(r => r.scenario));
  assert(scenarios.has('首次创业'), 'should cover 首次创业');
  assert(scenarios.has('投资决策'), 'should cover 投资决策');
  assert(scenarios.has('选址决策'), 'should cover 选址决策');
});

test('matchRules - 匹配首次创业+高投入规则', () => {
  const matched = matchRules({ experience_years: 0, investment: 5000000 });
  assert(matched.length > 0, 'should match rules');
  assert(matched.some(r => r.id === 'MK-RULE-0001'), 'should match MK-RULE-0001');
});

test('matchRules - 不匹配不符合条件的规则', () => {
  const matched = matchRules({ experience_years: 10, investment: 500000 });
  assert(!matched.some(r => r.id === 'MK-RULE-0001'), 'should NOT match MK-RULE-0001');
});

test('CASE_STUDIES - 有足够的案例 (>=15)', () => {
  assert(CASE_STUDIES.length >= 15, `got ${CASE_STUDIES.length}`);
  const successCases = CASE_STUDIES.filter(c => c.outcome.status === 'success');
  const failureCases = CASE_STUDIES.filter(c => c.outcome.status === 'failure');
  assert(successCases.length >= 5, `success cases: ${successCases.length}`);
  assert(failureCases.length >= 5, `failure cases: ${failureCases.length}`);
});

test('findSimilarCases - 按品类查找', () => {
  const results = findSimilarCases({ category: '火锅' });
  assert(results.length > 0, 'should find cases');
});

test('MASTER_EXPERIENCES - 有足够经验 (>=15)', () => {
  assert(MASTER_EXPERIENCES.length >= 15, `got ${MASTER_EXPERIENCES.length}`);
});

test('queryMasterWisdom - 按主题查询', () => {
  const results = queryMasterWisdom('选址');
  assert(results.length > 0, 'should find wisdom');
});

test('BUSINESS_MODELS - 有足够模型 (>=5)', () => {
  assert(BUSINESS_MODELS.length >= 5, `got ${BUSINESS_MODELS.length}`);
});

test('findModelsByScenario - 按场景查找', () => {
  const models = findModelsByScenario('投资决策');
  assert(models.length > 0, 'should find models');
});

// ═══════════════════════════════════════════════
// 2. CognitionEngine 判断框架
// ═══════════════════════════════════════════════

console.log('\n=== 2. 判断框架验证 ===\n');

test('getAllFrameworks - 至少有3个框架', () => {
  const frameworks = getAllFrameworks();
  assert(frameworks.length >= 3, `got ${frameworks.length}`);
});

test('框架包含关键变量', () => {
  const vars = RESTAURANT_SUCCESS_FRAMEWORK?.variables ?? [];
  assert(vars.length >= 5, `5vars should have >=5 variables, got ${vars.length}`);
  const ids = vars.map(v => v.id);
  assert(ids.includes('customer'), 'should include customer');
  assert(ids.includes('product'), 'should include product');
});

test('recommendFramework - 新项目推荐五变量', () => {
  const f = recommendFramework('我想开一家火锅店');
  assertEqual(f.id, 'restaurant-success-5vars', 'framework id');
});

test('recommendFramework - 品牌问题推荐品牌框架', () => {
  const f = recommendFramework('品牌定位怎么做');
  assertEqual(f.id, 'brand-positioning-4layers', 'framework id');
});

// ═══════════════════════════════════════════════
// 3. DefaultRiskAnalyzer
// ═══════════════════════════════════════════════

console.log('\n=== 3. RiskAnalyzer 验证 ===\n');

test('DefaultRiskAnalyzer - 识别无品类风险', () => {
  const analyzer = new DefaultRiskAnalyzer();
  const risks = analyzer.identifyRisks(
    { city: '杭州', category: '' },
    { experience_level: 'beginner', strengths: [], blindspots: [] }
  );
  assert(risks.length > 0, 'should identify risks');
  assert(risks.some(r => r.type === 'market'), 'should have market risk');
});

test('DefaultRiskAnalyzer - 风险按等级排序', () => {
  const analyzer = new DefaultRiskAnalyzer();
  const risks = analyzer.identifyRisks(
    { investment: 600, category: '', area: 400 },
    { experience_level: 'beginner', strengths: [], blindspots: [] }
  );
  const levelOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  for (let i = 1; i < risks.length; i++) {
    assert(
      levelOrder[risks[i-1].level] >= levelOrder[risks[i].level],
      `sort: ${risks[i-1].level} >= ${risks[i].level}`
    );
  }
});

test('DefaultRiskAnalyzer - 所有风险有缓解方案', () => {
  const analyzer = new DefaultRiskAnalyzer();
  const risks = analyzer.identifyRisks(
    { city: '杭州', category: '' },
    { experience_level: 'beginner', strengths: [], blindspots: [] }
  );
  for (const risk of risks) {
    assert(risk.mitigation !== undefined, `${risk.type} should have mitigation`);
    assert(risk.mitigation!.actions.length > 0, `${risk.type} should have actions`);
  }
});

// ═══════════════════════════════════════════════
// 4. Intent Detector
// ═══════════════════════════════════════════════

console.log('\n=== 4. Intent Detector 验证 ===\n');

test('新开店意图检测', () => {
  const r = detectLaunchIntent('我想在杭州开一家火锅店');
  assert(r.isLaunchIntent === true, `isLaunchIntent=${r.isLaunchIntent}`);
  assert(r.intentType === 'new_project', `intentType=${r.intentType}`);
  assert(r.entities.city === '杭州', `city=${r.entities.city}`);
  assert(r.entities.category === '火锅', `category=${r.entities.category}`);
});

test('可行性评估检测', () => {
  const r = detectLaunchIntent('开一家奶茶店能不能做？');
  assert(r.isLaunchIntent === true);
  assert(r.intentType === 'feasibility');
});

test('选址咨询检测', () => {
  const r = detectLaunchIntent('帮我看看哪里选址比较好');
  assert(r.isLaunchIntent === true);
  assert(r.intentType === 'location');
});

test('一般咨询不触发', () => {
  const r = detectLaunchIntent('今天天气怎么样');
  assert(r.isLaunchIntent === false);
  assert(r.intentType === 'general_advice');
});

test('shouldUseLaunchAgent 快速判断', () => {
  assert(shouldUseLaunchAgent('想开一家火锅店') === true);
  assert(shouldUseLaunchAgent('今天天气怎么样') === false);
});

// ═══════════════════════════════════════════════
// 5. LLM Cache
// ═══════════════════════════════════════════════

console.log('\n=== 5. LLM Cache 验证 ===\n');

test('缓存命中 - 相同内容只调用一次', async () => {
  const cache = new LLMCache(60000);
  let count = 0;
  const fn = async () => { count++; return 'ok'; };
  
  await cache.getOrFetch([{ role: 'user', content: 'hello' }], 0.3, fn);
  await cache.getOrFetch([{ role: 'user', content: 'hello' }], 0.3, fn);
  assertEqual(count, 1, 'should call once');
});

test('不同内容不共享缓存', async () => {
  const cache = new LLMCache(60000);
  let count = 0;
  const fn = async () => { count++; return `r${count}`; };
  
  await cache.getOrFetch([{ role: 'user', content: 'a' }], 0.3, fn);
  await cache.getOrFetch([{ role: 'user', content: 'b' }], 0.3, fn);
  assertEqual(count, 2, 'should call twice');
});

test('高 temperature 不缓存', async () => {
  const cache = new LLMCache(60000);
  let count = 0;
  const fn = async () => { count++; return 'r'; };
  
  await cache.getOrFetch([{ role: 'user', content: 'x' }], 0.8, fn);
  await cache.getOrFetch([{ role: 'user', content: 'x' }], 0.8, fn);
  assertEqual(count, 2, 'should call twice for high temp');
});

test('缓存统计', async () => {
  const cache = new LLMCache(60000);
  const fn = async () => 'r';
  
  await cache.getOrFetch([{ role: 'user', content: 's' }], 0.3, fn);
  await cache.getOrFetch([{ role: 'user', content: 's' }], 0.3, fn);
  
  const stats = cache.getStats();
  assert(stats.hits >= 1, `hits=${stats.hits}`);
  assert(stats.misses >= 1, `misses=${stats.misses}`);
  assert(stats.hitRate > 0, `hitRate=${stats.hitRate}`);
});

// ═══════════════════════════════════════════════
// 6. Project OS
// ═══════════════════════════════════════════════

console.log('\n=== 6. Project OS 验证 ===\n');

test('STAGES - 包含所有必要阶段', () => {
  const required = ['idea', 'positioning', 'location', 'setup', 'opening', 'growth'];
  for (const s of required) {
    assert(STAGES[s] !== undefined, `missing stage: ${s}`);
    assert(STAGES[s].name.length > 0, `${s} needs name`);
    assert(STAGES[s].keyActivities.length > 0, `${s} needs activities`);
  }
});

test('阶段转换验证', () => {
  const m = new LifecycleManager();
  assert(m.canTransition('idea', 'positioning'), 'idea->positioning');
  assert(!m.canTransition('opening', 'idea'), 'opening->idea invalid');
  assert(m.canTransition('growth', 'optimization'), 'growth->optimization');
});

test('进度计算', () => {
  const m = new LifecycleManager();
  const p = m.getProgress('positioning');
  assertEqual(p.current, 2, 'positioning is stage 2');
  assert(p.percentage > 0, 'has percentage');
});

// ═══════════════════════════════════════════════
// 7. ChallengeEngine 规则降级
// ═══════════════════════════════════════════════

console.log('\n=== 7. ChallengeEngine 规则降级验证 ===\n');

test('无 LLM 时规则降级', async () => {
  const engine = new ChallengeEngine();
  const result = await engine.generateChallenges(
    '这个地方租金便宜，年轻人多，开个网红奶茶店肯定能赚钱',
    {
      owner: {
        id: 'o1', userId: 'u1',
        experienceYears: 2, overallScore: 60,
        capabilities: [], strengths: [], blindspots: [],
        riskTolerance: 'medium',
        preferences: { investmentStyle: 'moderate', productFocus: false, brandAwareness: false, dataDriven: false },
      },
      situation: { currentGoal: '开店', problemType: 'feasibility', urgency: 'medium', context: {} },
      memories: [], knowledge: [], history: [],
    }
  );
  assert(result.challenges.length > 0, 'should generate challenges');
  const types = result.challenges.map(c => c.type);
  assert(types.includes('financial'), 'should detect rent');
  assert(types.includes('market'), 'should detect young customer');
});

test('高风险假设对应验证行动', async () => {
  const engine = new ChallengeEngine();
  const result = await engine.generateChallenges(
    '这里没有竞争，开一家肯定赚钱',
    {
      owner: {
        id: 'o2', userId: 'u2',
        experienceYears: 1, overallScore: 40,
        capabilities: [], strengths: [], blindspots: ['brand'],
        riskTolerance: 'medium',
        preferences: { investmentStyle: 'moderate', productFocus: false, brandAwareness: false, dataDriven: false },
      },
      situation: { currentGoal: '开店', problemType: 'feasibility', urgency: 'medium', context: {} },
      memories: [], knowledge: [], history: [],
    }
  );
  assert(result.overallRisk === 'high', 'no competition = high risk');
  assert(result.recommendedActions.length > 0, 'has actions');
});

// ═══════════════════════════════════════════════
// 8. ChiefToolRegistry
// ═══════════════════════════════════════════════

console.log('\n=== 8. ChiefToolRegistry 验证 ===\n');

test('注册和获取工具', () => {
  const r = new ChiefToolRegistry();
  r.register({ name: 't1', description: 'test', inputSchema: {}, execute: async () => ({ success: true, data: 'ok' }) });
  assert(r.get('t1') !== undefined, 'should find tool');
});

test('执行工具', async () => {
  const r = new ChiefToolRegistry();
  r.register({ name: 'echo', description: 'echo', inputSchema: {}, execute: async (i) => ({ success: true, data: i }) });
  const res = await r.execute('echo', { msg: 'hi' });
  assert(res.success === true);
  assertEqual((res.data as any).msg, 'hi', 'should pass input');
});

test('不存在的工具返回错误', async () => {
  const r = new ChiefToolRegistry();
  const res = await r.execute('nope', {});
  assert(res.success === false);
  assert(res.error !== undefined, 'should have error');
});

// ═══════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════

console.log(`\n========================================`);
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
console.log(`========================================`);

if (errors.length > 0) {
  console.log('\n失败详情:');
  for (const e of errors) console.log(`  - ${e}`);
}

process.exit(failed > 0 ? 1 : 0);
