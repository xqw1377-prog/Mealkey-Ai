import { 
  AgentRegistry, CapabilityRegistry, MissionRouter, 
  WorkflowEngine, AgentRuntime, createRuntime
} from '@mealkey/agent-runtime';
import type { AgentDefinition } from '@mealkey/agent-sdk';

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

console.log('\n=== @mealkey/agent-runtime 测试 ===\n');

// ─── AgentRegistry 测试 ───
console.log('--- AgentRegistry ---');

test('AgentRegistry - 创建实例', () => {
  const registry = new AgentRegistry();
  assert(registry !== null, 'should create AgentRegistry instance');
});

test('AgentRegistry - 注册和获取 Agent', () => {
  const registry = new AgentRegistry();
  const mockAgent: AgentDefinition = {
    manifest: {
      id: 'test-agent',
      name: 'Test Agent',
      version: '1.0.0',
      category: 'test',
      description: 'A test agent',
    },
    workflow: {
      name: 'Test Workflow',
      steps: [],
    },
  };
  
  registry.register(mockAgent);
  assert(registry.has('test-agent'), 'should have registered agent');
  
  const retrieved = registry.get('test-agent');
  assert(retrieved === mockAgent, 'should return the same agent instance');
});

test('AgentRegistry - 列出所有 Agent', () => {
  const registry = new AgentRegistry();
  const agent1: AgentDefinition = {
    manifest: { id: 'agent-1', name: 'Agent 1', category: 'type-a' },
    workflow: { name: 'Workflow 1', steps: [] },
  };
  const agent2: AgentDefinition = {
    manifest: { id: 'agent-2', name: 'Agent 2', category: 'type-b' },
    workflow: { name: 'Workflow 2', steps: [] },
  };
  
  registry.registerBatch([agent1, agent2]);
  const list = registry.list();
  assert(list.length === 2, 'should list 2 agents');
});

test('AgentRegistry - 按分类查询', () => {
  const registry = new AgentRegistry();
  const agent1: AgentDefinition = {
    manifest: { id: 'agent-1', name: 'Agent 1', category: 'type-a' },
    workflow: { name: 'Workflow 1', steps: [] },
  };
  const agent2: AgentDefinition = {
    manifest: { id: 'agent-2', name: 'Agent 2', category: 'type-b' },
    workflow: { name: 'Workflow 2', steps: [] },
  };
  
  registry.registerBatch([agent1, agent2]);
  const filtered = registry.listByCategory('type-a');
  assert(filtered.length === 1, 'should filter by category');
  assert(filtered[0].manifest.id === 'agent-1', 'should return correct agent');
});

test('AgentRegistry - 重复注册抛出错误', () => {
  const registry = new AgentRegistry();
  const agent: AgentDefinition = {
    manifest: { id: 'duplicate', name: 'Duplicate', category: 'test' },
    workflow: { name: 'Workflow', steps: [] },
  };
  
  registry.register(agent);
  let threw = false;
  try {
    registry.register(agent);
  } catch {
    threw = true;
  }
  assert(threw, 'should throw error on duplicate registration');
});

test('AgentRegistry - 获取 Manifest 列表', () => {
  const registry = new AgentRegistry();
  const agent: AgentDefinition = {
    manifest: { 
      id: 'manifest-test', 
      name: 'Manifest Test', 
      version: '2.0.0',
      category: 'test',
      description: 'Test description',
    },
    workflow: { name: 'Test Workflow', steps: [] },
  };
  
  registry.register(agent);
  const manifests = registry.listManifests();
  assert(manifests.length === 1, 'should return 1 manifest');
  assert(manifests[0].id === 'manifest-test', 'should have correct id');
  assert(manifests[0].version === '2.0.0', 'should have correct version');
});

// ─── CapabilityRegistry 测试 ───
console.log('\n--- CapabilityRegistry ---');

test('CapabilityRegistry - 创建实例', () => {
  const capRegistry = new CapabilityRegistry();
  assert(capRegistry !== null, 'should create CapabilityRegistry instance');
});

test('CapabilityRegistry - 注册和获取能力', () => {
  const capRegistry = new CapabilityRegistry();
  
  capRegistry.register({
    id: 'test-capability',
    name: 'Test Capability',
    description: 'A test capability',
    inputSchema: {},
    outputSchema: {},
  });
  
  const cap = capRegistry.get('test-capability');
  assert(cap !== undefined, 'should retrieve registered capability');
  assert(cap?.id === 'test-capability', 'should have correct id');
});

test('CapabilityRegistry - 列出所有能力', () => {
  const capRegistry = new CapabilityRegistry();
  
  capRegistry.register({ id: 'cap-1', name: 'Cap 1', inputSchema: {}, outputSchema: {} });
  capRegistry.register({ id: 'cap-2', name: 'Cap 2', inputSchema: {}, outputSchema: {} });
  
  const list = capRegistry.list();
  assert(list.length === 2, 'should list 2 capabilities');
});

// ─── WorkflowEngine 测试 ───
console.log('\n--- WorkflowEngine ---');

test('WorkflowEngine - 创建实例', () => {
  const wfEngine = new WorkflowEngine();
  assert(wfEngine !== null, 'should create WorkflowEngine instance');
});

// ─── MissionRouter 测试 ───
console.log('\n--- MissionRouter ---');

test('MissionRouter - 创建实例', () => {
  const registry = new AgentRegistry();
  const router = new MissionRouter({ registry });
  assert(router !== null, 'should create MissionRouter instance');
});

// ─── createRuntime 工厂函数测试 ───
console.log('\n--- createRuntime ---');

test('createRuntime - 创建 Runtime 实例', () => {
  const runtime = createRuntime({
    llm: {
      provider: 'deepseek',
      apiKey: 'test-key',
    },
  });
  assert(runtime !== null, 'should create AgentRuntime instance');
});

// ─── AgentRuntime 测试 ───
console.log('\n--- AgentRuntime ---');

test('AgentRuntime - 创建实例', () => {
  const registry = new AgentRegistry();
  const capRegistry = new CapabilityRegistry();
  const wfEngine = new WorkflowEngine();
  const router = new MissionRouter({ registry });
  
  const runtime = new AgentRuntime({
    registry,
    capabilityRegistry: capRegistry,
    workflowEngine: wfEngine,
    missionRouter: router,
    llmAdapter: null as any, // 测试中不需要真实 LLM
  });
  
  assert(runtime !== null, 'should create AgentRuntime instance');
});

console.log(`\n测试结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
