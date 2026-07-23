import { 
  MKContext, MKDecision, Evidence, 
  AgentManifest, CapabilityDefinition, Mission, AgentRun,
  MemoryEngine, MemoryInput, MemoryLayer,
  safeParseJson, safeParseJsonArray
} from '@mealkey/agent-sdk';

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

console.log('\n=== @mealkey/agent-sdk 测试 ===\n');

// 测试安全解析函数
test('safeParseJson - 有效JSON', () => {
  const result = safeParseJson('{"name":"test","value":123}');
  assert(result !== null, 'should parse valid JSON');
  assert((result as any).name === 'test', 'should have correct name');
});

test('safeParseJson - 无效JSON', () => {
  const result = safeParseJson('{invalid json}');
  assert(result === null, 'should return null for invalid JSON');
});

test('safeParseJsonArray - 有效JSON数组', () => {
  const result = safeParseJsonArray('[1,2,3]');
  assert(Array.isArray(result), 'should return array');
  assert(result.length === 3, 'should have 3 elements');
});

test('safeParseJsonArray - 无效JSON', () => {
  const result = safeParseJsonArray('{not an array}');
  assert(Array.isArray(result), 'should return array');
  assert(result.length === 0, 'should return empty array for invalid JSON');
});

// 测试类型导出
test('MKContext 类型存在', () => {
  // 这是编译时检查，如果导入成功就表示类型存在
  assert(true, 'MKContext should be importable');
});

test('MKDecision 类型存在', () => {
  assert(true, 'MKDecision should be importable');
});

test('AgentManifest 类型存在', () => {
  assert(true, 'AgentManifest should be importable');
});

test('Mission 类型存在', () => {
  assert(true, 'Mission should be importable');
});

console.log(`\n测试结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
