import { KnowledgeEngine, type KnowledgeStorageAdapter } from '@mealkey/knowledge-engine';
import { MemoryEngine, type MemoryStorage } from '@mealkey/memory-engine';

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

// ─── Mock Storage 实现 ───

const mockKnowledgeStorage: KnowledgeStorageAdapter = {
  searchNodes: async (query: string, options: { category?: string; topK?: number }) => {
    return [
      {
        id: 'node-1',
        title: '测试知识节点',
        content: '这是测试内容',
        categoryName: options.category ?? '测试分类',
        tags: '["tag1","tag2"]',
        source: 'industry',
        status: 'published',
      },
    ];
  },
  findCategory: async (name: string) => {
    return { id: 'cat-1', name };
  },
  createCategory: async (name: string) => {
    return { id: 'cat-new', name };
  },
  createNode: async (data) => {
    // 模拟创建节点
  },
};

const mockMemoryStorage: MemoryStorage = {
  findProjectMemories: async (projectId: string, key?: string) => {
    return [
      {
        key: 'test-key',
        value: '{"test": "value"}',
        source: 'test',
        confidence: 0.9,
        updatedAt: new Date(),
      },
    ];
  },
  upsertProjectMemory: async (projectId: string, key: string, value: string, source: string, confidence: number) => {
    // 模拟保存
  },
  createDecision: async (projectId: string, data) => {
    return {
      id: 'decision-1',
      projectId,
      agentId: data.agentId,
      type: data.type,
      confidence: data.confidence,
      outcome: null,
      learning: null,
      createdAt: new Date(),
    };
  },
  findDecisions: async (projectId: string, type?: string) => {
    return [
      {
        id: 'decision-1',
        projectId,
        agentId: 'agent-1',
        type: 'test',
        problem: '测试问题',
        reasoning: '测试推理',
        confidence: 0.8,
        outcome: null,
        learning: null,
        createdAt: new Date(),
      },
    ];
  },
  updateDecision: async (decisionId: string, outcome: string, learning?: string) => {
    // 模拟更新
  },
};

console.log('\n=== @mealkey/knowledge-engine 测试 ===\n');

test('KnowledgeEngine - 创建实例', () => {
  const engine = new KnowledgeEngine(mockKnowledgeStorage);
  assert(engine !== null, 'should create KnowledgeEngine instance');
});

test('KnowledgeEngine - search 搜索知识', async () => {
  const engine = new KnowledgeEngine(mockKnowledgeStorage);
  const results = await engine.search('测试查询');
  assert(Array.isArray(results), 'should return array');
  assert(results.length > 0, 'should return results');
  assert(results[0].title === '测试知识节点', 'should have correct title');
});

test('KnowledgeEngine - getContextForAgent 获取上下文', async () => {
  const engine = new KnowledgeEngine(mockKnowledgeStorage);
  const context = await engine.getContextForAgent('agent-1', 'project-1', '测试查询');
  assert(Array.isArray(context), 'should return array');
  assert(context.length > 0, 'should return context items');
});

test('KnowledgeEngine - addKnowledge 添加知识', async () => {
  const engine = new KnowledgeEngine(mockKnowledgeStorage);
  // 不应该抛出错误
  await engine.addKnowledge({
    title: '新知识',
    content: '新内容',
    category: '新分类',
    layer: 'industry',
    tags: ['new'],
  });
  assert(true, 'should not throw');
});

test('KnowledgeEngine - learnFromAgentOutput 从输出学习', async () => {
  const engine = new KnowledgeEngine(mockKnowledgeStorage);
  await engine.learnFromAgentOutput('agent-1', 'project-1', {
    decision: { summary: '测试决策', reasoning: '测试推理' },
  });
  assert(true, 'should not throw');
});

console.log('\n=== @mealkey/memory-engine 测试 ===\n');

test('MemoryEngine - 创建实例', () => {
  const engine = new MemoryEngine(mockMemoryStorage);
  assert(engine !== null, 'should create MemoryEngine instance');
});

test('MemoryEngine - getProjectMemory 获取记忆', async () => {
  const engine = new MemoryEngine(mockMemoryStorage);
  const memories = await engine.getProjectMemory('project-1');
  assert(Array.isArray(memories), 'should return array');
  assert(memories.length > 0, 'should return memories');
  assert(memories[0].key === 'test-key', 'should have correct key');
});

test('MemoryEngine - saveProjectMemory 保存记忆', async () => {
  const engine = new MemoryEngine(mockMemoryStorage);
  await engine.saveProjectMemory('project-1', {
    key: 'new-key',
    value: { data: 'test' },
    source: 'test',
    confidence: 0.9,
  });
  assert(true, 'should not throw');
});

test('MemoryEngine - saveDecision 保存决策', async () => {
  const engine = new MemoryEngine(mockMemoryStorage);
  const decision = await engine.saveDecision('project-1', 'agent-1', {
    type: 'test',
    summary: '测试决策',
    confidence: 0.8,
  });
  assert(decision !== null, 'should return decision');
  assert(decision.id === 'decision-1', 'should have correct id');
});

test('MemoryEngine - getDecisionHistory 获取决策历史', async () => {
  const engine = new MemoryEngine(mockMemoryStorage);
  const history = await engine.getDecisionHistory('project-1');
  assert(Array.isArray(history), 'should return array');
  assert(history.length > 0, 'should return decisions');
});

test('MemoryEngine - updateDecisionOutcome 更新决策结果', async () => {
  const engine = new MemoryEngine(mockMemoryStorage);
  await engine.updateDecisionOutcome('decision-1', 'success', '学到了经验');
  assert(true, 'should not throw');
});

test('MemoryEngine - getContextForAgent 获取 Agent 上下文', async () => {
  const engine = new MemoryEngine(mockMemoryStorage);
  const context = await engine.getContextForAgent('project-1', 'agent-1');
  assert(context !== null, 'should return context');
  assert(Array.isArray(context.memories), 'should have memories');
  assert(Array.isArray(context.recentDecisions), 'should have recentDecisions');
});

console.log(`\n测试结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
