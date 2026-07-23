/**
 * Seed Knowledge — 将 @mealkey/core 中的知识数据灌入数据库
 *
 * 将 150+ 规则、50+ 案例、50+ 大师经验、15+ 经营模型写入 knowledgeNode 表，
 * 使 LLM 在运行时能查询到真实的餐饮经营知识。
 *
 * 运行方式: npx tsx prisma/seed-knowledge.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  DECISION_RULES,
  CASE_STUDIES,
  MASTER_EXPERIENCES,
  BUSINESS_MODELS,
} from "@mealkey/core";

const prisma = new PrismaClient();

function json(value: unknown) {
  return JSON.stringify(value);
}

async function ensureCategory(name: string, id: string, sortOrder: number) {
  return prisma.knowledgeCategory.upsert({
    where: { id },
    update: { name, sortOrder },
    create: { id, name, sortOrder },
  });
}

async function main() {
  console.log("Seeding knowledge base from @mealkey/core...\n");

  // 1. 确保分类存在
  const categories = {
    rule: await ensureCategory("经营规则", "cat-rules", 1),
    case: await ensureCategory("案例库", "cat-cases", 2),
    experience: await ensureCategory("大师经验", "cat-experiences", 3),
    model: await ensureCategory("经营模型", "cat-models", 4),
    startup: await ensureCategory("创业风险", "cat-startup", 5),
    investment: await ensureCategory("投资决策", "cat-investment", 6),
    location: await ensureCategory("选址决策", "cat-location", 7),
    category: await ensureCategory("品类选择", "cat-category", 8),
    product: await ensureCategory("产品策略", "cat-product", 9),
    cost: await ensureCategory("成本控制", "cat-cost", 10),
    growth: await ensureCategory("增长策略", "cat-growth", 11),
    operation: await ensureCategory("运营管理", "cat-operation", 12),
    brand: await ensureCategory("品牌建设", "cat-brand", 13),
    team: await ensureCategory("团队管理", "cat-team", 14),
    marketing: await ensureCategory("营销推广", "cat-marketing", 15),
    supply: await ensureCategory("供应链管理", "cat-supply", 16),
    digital: await ensureCategory("数字化转型", "cat-digital", 17),
    crisis: await ensureCategory("危机管理", "cat-crisis", 18),
    finance: await ensureCategory("融资决策", "cat-finance", 19),
  };

  // 分类映射
  const getCategoryId = (scenario: string): string => {
    const map: Record<string, string> = {
      "首次创业": "cat-startup",
      "投资决策": "cat-investment",
      "选址决策": "cat-location",
      "品类选择": "cat-category",
      "产品策略": "cat-product",
      "成本控制": "cat-cost",
      "扩张决策": "cat-growth",
      "增长策略": "cat-growth",
      "运营管理": "cat-operation",
      "品牌建设": "cat-brand",
      "团队管理": "cat-team",
      "营销策略": "cat-marketing",
      "供应链管理": "cat-supply",
      "数字化转型": "cat-digital",
      "危机管理": "cat-crisis",
      "融资决策": "cat-finance",
      "特殊场景": "cat-operation",
    };
    return map[scenario] ?? "cat-rules";
  };

  // 2. 导入规则
  let ruleCount = 0;
  for (const rule of DECISION_RULES) {
    try {
      await prisma.knowledgeNode.upsert({
        where: { id: rule.id },
        update: {
          title: rule.description,
          content: `${rule.judgement}
风险等级: ${rule.risk}
建议: ${rule.recommendation}
来源: ${rule.source}`,
          categoryId: getCategoryId(rule.scenario),
          type: "rule",
          tags: json([rule.scenario, rule.risk]),
          source: rule.source,
          status: "published",
          confidence: rule.weight,
        },
        create: {
          id: rule.id,
          title: rule.description,
          content: `${rule.judgement}
风险等级: ${rule.risk}
建议: ${rule.recommendation}
来源: ${rule.source}`,
          categoryId: getCategoryId(rule.scenario),
          type: "rule",
          tags: json([rule.scenario, rule.risk]),
          source: rule.source,
          status: "published",
          confidence: rule.weight,
        },
      });
      ruleCount++;
    } catch (e) {
      console.error(`  Failed to upsert rule ${rule.id}:`, e);
    }
  }
  console.log(`  ✓ ${ruleCount} rules imported`);

  // 3. 导入案例
  let caseCount = 0;
  for (const c of CASE_STUDIES) {
    try {
      const lessons = c.lessons.join("\n");
      const timeline = c.timeline.map(t => `${t.date}: ${t.event} → ${t.result}`).join("\n");
      await prisma.knowledgeNode.upsert({
        where: { id: c.id },
        update: {
          title: c.title,
          content: `行业: ${c.industry} | 品类: ${c.category} | 城市: ${c.basics.city || "未知"}
面积: ${c.basics.area || "未知"}㎡ | 投资: ${c.basics.investment || "未知"}万
结果: ${c.outcome.status === "success" ? "✅ 成功" : c.outcome.status === "failure" ? "❌ 失败" : "➖ 中性"}
营收: ${c.outcome.revenue || "未知"}万/月 | 利润: ${c.outcome.profit || "未知"}万/月
持续: ${c.outcome.duration || "未知"}

发展过程:
${timeline}

经验教训:
${lessons}

适用场景: ${c.applicableScenarios.join("、")}`,
          categoryId: c.outcome.status === "success" ? "cat-growth" : "cat-operation",
          type: "case",
          tags: json([c.category, c.outcome.status, ...c.applicableScenarios.slice(0, 3)]),
          source: c.source,
          status: "published",
          confidence: c.confidence,
        },
        create: {
          id: c.id,
          title: c.title,
          content: `行业: ${c.industry} | 品类: ${c.category} | 城市: ${c.basics.city || "未知"}
面积: ${c.basics.area || "未知"}㎡ | 投资: ${c.basics.investment || "未知"}万
结果: ${c.outcome.status === "success" ? "✅ 成功" : c.outcome.status === "failure" ? "❌ 失败" : "➖ 中性"}
营收: ${c.outcome.revenue || "未知"}万/月 | 利润: ${c.outcome.profit || "未知"}万/月
持续: ${c.outcome.duration || "未知"}

发展过程:
${timeline}

经验教训:
${lessons}

适用场景: ${c.applicableScenarios.join("、")}`,
          categoryId: c.outcome.status === "success" ? "cat-growth" : "cat-operation",
          type: "case",
          tags: json([c.category, c.outcome.status, ...c.applicableScenarios.slice(0, 3)]),
          source: c.source,
          status: "published",
          confidence: c.confidence,
        },
      });
      caseCount++;
    } catch (e) {
      console.error(`  Failed to upsert case ${c.id}:`, e);
    }
  }
  console.log(`  ✓ ${caseCount} cases imported`);

  // 4. 导入大师经验
  let expCount = 0;
  for (const e of MASTER_EXPERIENCES) {
    try {
      await prisma.knowledgeNode.upsert({
        where: { id: e.id },
        update: {
          title: e.question,
          content: `话题: ${e.topic}
场景: ${e.scenario}

核心智慧:
${e.wisdom}

推理:
${e.reasoning}

风险提示: ${e.risks.join("、")}

应用建议:
${e.application}

大师: ${e.master}`,
          categoryId: "cat-experiences",
          type: "principle",
          tags: json([e.topic, e.scenario]),
          source: e.source,
          status: "published",
          confidence: e.confidence,
        },
        create: {
          id: e.id,
          title: e.question,
          content: `话题: ${e.topic}
场景: ${e.scenario}

核心智慧:
${e.wisdom}

推理:
${e.reasoning}

风险提示: ${e.risks.join("、")}

应用建议:
${e.application}

大师: ${e.master}`,
          categoryId: "cat-experiences",
          type: "principle",
          tags: json([e.topic, e.scenario]),
          source: e.source,
          status: "published",
          confidence: e.confidence,
        },
      });
      expCount++;
    } catch (e) {
      console.error(`  Failed to upsert experience:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`  ✓ ${expCount} experiences imported`);

  // 5. 导入经营模型
  let modelCount = 0;
  for (const m of BUSINESS_MODELS) {
    try {
      const params = m.parameters.map(p => `- ${p.name}: ${p.description} (${p.unit})`).join("\n");
      const benchmarks = Object.entries(m.benchmarks)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n");

      await prisma.knowledgeNode.upsert({
        where: { id: m.id },
        update: {
          title: m.name,
          content: `分类: ${m.category}
描述: ${m.description}

参数:
${params}

公式: ${m.formula}

基准值:
${benchmarks || "无"}

适用场景: ${m.applicableScenarios.join("、")}

来源: ${m.source}`,
          categoryId: "cat-models",
          type: "model",
          tags: json([m.category, ...m.applicableScenarios.slice(0, 3)]),
          source: m.source,
          status: "published",
          confidence: 0.8,
        },
        create: {
          id: m.id,
          title: m.name,
          content: `分类: ${m.category}
描述: ${m.description}

参数:
${params}

公式: ${m.formula}

基准值:
${benchmarks || "无"}

适用场景: ${m.applicableScenarios.join("、")}

来源: ${m.source}`,
          categoryId: "cat-models",
          type: "model",
          tags: json([m.category, ...m.applicableScenarios.slice(0, 3)]),
          source: m.source,
          status: "published",
          confidence: 0.8,
        },
      });
      modelCount++;
    } catch (e) {
      console.error(`  Failed to upsert model ${m.id}:`, e);
    }
  }
  console.log(`  ✓ ${modelCount} models imported`);

  console.log(`\n✅ Knowledge seed complete!`);
  console.log(`  Total: ${ruleCount + caseCount + expCount + modelCount} knowledge nodes`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
