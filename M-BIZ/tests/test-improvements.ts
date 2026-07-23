/**
 * 测试 5 个改进点的基本功能
 *
 * 运行方式: npx tsx tests/test-improvements.ts
 */

async function testImprovements() {
  let passed = 0;
  let failed = 0;

  function assert(name: string, ok: boolean, detail?: string) {
    if (ok) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  console.log("\n📋 测试改进: 5 个能力升级\n");

  // ═══ 改进1: 联网搜索 ═══
  console.log("─── 改进1: 联网搜索能力 ───");
  try {
    const { WebSearchManager } = await import("@mealkey/knowledge-engine");
    const ws = new WebSearchManager();
    assert("WebSearchManager 初始化成功", ws.activeProviders.length > 0, "至少有一个provider(DuckDuckGo)");
    assert("WebSearchManager.isAvailable = true", ws.isAvailable);
  } catch (e) {
    assert("WebSearchManager 初始化失败", false, String(e));
  }

  // ═══ 改进2: 案例库扩展 ═══
  console.log("\n─── 改进2: 案例库扩展到 80+ ───");
  try {
    const { ALL_CASES, findAllSimilarCases } = await import("@mealkey/knowledge-engine");
    assert(`全量案例数: ${ALL_CASES.length}`, ALL_CASES.length >= 60, `当前 ${ALL_CASES.length} 个案例（核心20+扩展16+第三卷25=61）`);

    const similar = findAllSimilarCases({ category: "咖啡", scenario: "社区" });
    assert("咖啡+社区场景能找到案例", similar.length > 0, `找到 ${similar.length} 个`);

    const noMatch = findAllSimilarCases({ category: "未知品类999" });
    assert("不存在的品类返回空", noMatch.length === 0);
  } catch (e) {
    assert("案例库扩展测试失败", false, String(e));
  }

  // ═══ 改进3: 品类模板 ═══
  console.log("\n─── 改进3: 品类分析模板 ───");
  try {
    const { CATEGORY_PROFILES, getCategoryProfile, getCategoryBenchmarks } = await import("@mealkey/knowledge-engine");

    assert(`品类模板数: ${CATEGORY_PROFILES.length}`, CATEGORY_PROFILES.length >= 10, `当前 ${CATEGORY_PROFILES.length} 个品类`);

    const hotpot = getCategoryProfile("火锅");
    assert("火锅品类模板存在", !!hotpot);
    assert("火锅有毛利率基准", hotpot?.benchmarks.grossMargin[0] > 0);
    assert("火锅有成功因素", (hotpot?.successFactors.length ?? 0) >= 3);
    assert("火锅有失败原因", (hotpot?.failureReasons.length ?? 0) >= 3);

    const benchmarks = getCategoryBenchmarks("湘菜");
    assert("湘菜有基准数据", !!benchmarks);

    const noProfile = getCategoryProfile("不存在的品类");
    assert("不存在品类返回 null", noProfile === null);
  } catch (e) {
    assert("品类模板测试失败", false, String(e));
  }

  // ═══ 改进4: 多模态 ═══
  console.log("\n─── 改进4: 多模态（图片识别）───");
  try {
    const { VisionAnalyzer } = await import("@mealkey/knowledge-engine");
    const va = new VisionAnalyzer();
    assert("VisionAnalyzer 初始化成功", va.isAvailable);

    // 测试菜单文本识别（直接给模拟OCR无法处理的场景）
    const result = await va.analyze(""); // 空字符串触发 unknown
    assert("空图片识别为 unknown", result.type === "unknown");

    // 测试结构化提取（模拟菜单文本）
    const menuResult = await va.analyzeMenu(""); // 空图片
    assert("空菜单分析返回空列表", menuResult.items.length === 0);
  } catch (e) {
    assert("多模态测试失败", false, String(e));
  }

  // ═══ 改进5: 自动知识提取 ═══
  console.log("\n─── 改进5: 对话自动知识提取 ───");
  try {
    const { AutoKnowledgeExtractor } = await import("@mealkey/core");
    const extractor = new AutoKnowledgeExtractor();

    // 测试市场数据提取
    const marketMsg = "火锅市场规模约5000亿，年增长率12%";
    const marketFragments = extractor.extractFromUserMessage("user1", marketMsg);
    assert("市场数据能提取", marketFragments.length > 0, `提取了 ${marketFragments.length} 条`);
    assert("提取的类型是 fact", marketFragments[0]?.type === "fact");

    // 测试经验提取
    const expMsg = "我的经验是：社区店的核心是复购率，不是客流量。";
    const expFragments = extractor.extractFromUserMessage("user1", expMsg);
    assert("用户经验能提取", expFragments.length > 0);

    // 测试规则提取
    const ruleMsg = "食品安全是生死线，一定要严格控制。";
    const ruleFragments = extractor.extractFromUserMessage("user1", ruleMsg);
    assert("规则原则能提取", ruleFragments.length > 0);

    // 测试模式提取
    const history = [
      { role: "user" as const, content: "我想开一家火锅店" },
      { role: "user" as const, content: "火锅的选址有什么讲究" },
      { role: "user" as const, content: "火锅的菜单怎么做" },
      { role: "user" as const, content: "火锅店需要多少钱" },
    ];
    const patterns = extractor.extractPatternsFromHistory(history);
    assert("模式分析能识别高频品类", patterns.some(p => p.content.includes("火锅")), 
      `品类关注: ${patterns.map(p => p.title).join(", ")}`);

    // 测试记忆格式转换
    const mems = extractor.toMemoryFormat(marketFragments);
    assert("知识碎片能转为记忆格式", mems.length > 0);
    assert("记忆包含 layer", mems[0]?.layer === "learning");
    assert("记忆包含 importance", (mems[0]?.importance ?? 0) > 0);
  } catch (e) {
    assert("自动知识提取测试失败", false, String(e));
  }

  // ═══ 总结 ═══
  console.log(`\n📊 测试结果: ${passed} ✅ / ${failed} ❌ (共 ${passed + failed} 项)\n`);

  return { passed, failed };
}

testImprovements().catch(console.error);
