import { allAgents, LaunchAgent, getAgentsByCategory, getAgentById, agentIds } from '@mealkey/agents';
import type { AgentDefinition, Workflow } from '@mealkey/agent-sdk';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

console.log('\n=== @mealkey/agents 测试 ===\n');

// ─── 导出测试 ───
console.log('--- 导出测试 ---');

test('allAgents - 存在且为数组', () => {
  assert(Array.isArray(allAgents), 'allAgents should be an array');
  assert(allAgents.length > 0, 'allAgents should have at least 1 agent');
});

test('LaunchAgent - 存在', () => {
  assert(LaunchAgent !== null, 'LaunchAgent should exist');
  assert(typeof LaunchAgent === 'object', 'LaunchAgent should be an object');
});

test('getAgentsByCategory - 按分类查询', () => {
  const startupAgents = getAgentsByCategory('startup');
  assert(Array.isArray(startupAgents), 'should return array');
  assert(startupAgents.length > 0, 'should find startup agents');
});

test('getAgentById - 按ID查询', () => {
  const agent = getAgentById('launch');
  assert(agent !== undefined, 'should find launch');
  assert(agent?.manifest.id === 'launch', 'should return correct agent');
});

test('agentIds - ID列表', () => {
  assert(Array.isArray(agentIds), 'agentIds should be an array');
  assert(agentIds.includes('launch'), 'should include launch');
  assert(agentIds.includes('m-pnt'), 'should include m-pnt');
});

test('MPntAgent - 注册与能力', () => {
  const agent = getAgentById('m-pnt');
  assert(agent !== undefined, 'should find m-pnt');
  assert(agent?.manifest.id === 'm-pnt', 'id');
  assert(agent?.manifest.category === 'positioning', 'category');
  assert((agent?.capabilities.length ?? 0) === 6, '6 capabilities');
  assert((agent?.workflow.steps.length ?? 0) === 7, '7 workflow steps');
  const last = agent?.workflow.steps[agent.workflow.steps.length - 1];
  assert(last?.output === 'final', 'final step');
});

// ─── LaunchAgent Manifest 测试 ───
console.log('\n--- LaunchAgent Manifest ---');

test('LaunchAgent.manifest - 基本信息', () => {
  const manifest = LaunchAgent.manifest;
  assert(manifest.id === 'launch', 'should have correct id');
  assert(manifest.name === 'MealKey 开店顾问', 'should have correct name');
  assert(manifest.version === '1.0.0', 'should have correct version');
  assert(manifest.category === 'startup', 'should have correct category');
});

test('LaunchAgent.manifest - 能力列表', () => {
  const capabilities = LaunchAgent.manifest.capabilities;
  assert(Array.isArray(capabilities), 'should have capabilities array');
  assert(capabilities.length >= 4, 'should have at least 4 capabilities');
  assert(capabilities.includes('business_diagnosis'), 'should include business_diagnosis');
  assert(capabilities.includes('market_analysis'), 'should include market_analysis');
  assert(capabilities.includes('positioning'), 'should include positioning');
  assert(capabilities.includes('finance_analysis'), 'should include finance_analysis');
});

test('LaunchAgent.manifest - 定价信息', () => {
  const pricing = LaunchAgent.manifest.pricing;
  assert(pricing !== undefined, 'should have pricing');
  assert(pricing?.type === 'one_time', 'should be one_time pricing');
  assert(pricing?.price === 99900, 'should have correct price');
  assert(pricing?.currency === 'CNY', 'should have correct currency');
});

// ─── LaunchAgent Workflow 测试 ───
console.log('\n--- LaunchAgent Workflow ---');

test('LaunchAgent.workflow - 存在', () => {
  assert(LaunchAgent.workflow !== null, 'workflow should exist');
  assert(typeof LaunchAgent.workflow === 'object', 'workflow should be an object');
});

test('LaunchAgent.workflow - 工作流名称', () => {
  const workflow: Workflow = LaunchAgent.workflow;
  assert(workflow.name === '开店战略分析流程', 'should have correct workflow name');
});

test('LaunchAgent.workflow - 步骤数量', () => {
  const workflow: Workflow = LaunchAgent.workflow;
  assert(Array.isArray(workflow.steps), 'should have steps array');
  assert(workflow.steps.length === 5, 'should have 5 steps');
});

test('LaunchAgent.workflow - 步骤顺序', () => {
  const workflow: Workflow = LaunchAgent.workflow;
  const stepIds = workflow.steps.map((s) => s.id);
  assert(stepIds[0] === 'owner_analysis', 'first step should be owner_analysis');
  assert(stepIds[1] === 'market_analysis', 'second step should be market_analysis');
  assert(stepIds[2] === 'positioning', 'third step should be positioning');
  assert(stepIds[3] === 'finance_analysis', 'fourth step should be finance_analysis');
  assert(stepIds[4] === 'final_decision', 'fifth step should be final_decision');
});

console.log(`\n测试结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
