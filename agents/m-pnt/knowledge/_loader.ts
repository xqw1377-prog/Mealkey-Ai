/**
 * M-PNT Knowledge Loader V2
 *
 * 统一加载器，从 knowledge/ 目录加载所有知识资产 + 跨资产索引。
 * 支持双轨兼容：优先目录，回退代码内嵌。
 *
 * 使用方式：
 *   const loader = new KnowledgeLoader();
 *   const bundle = loader.loadForCategory('ries', { category: '湘菜', city: '长沙' });
 *   const fragment = loader.buildPromptFragment({ theoryIds: ['ries'], maxRules: 3 });
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── 类型 ─────────────────────────────────────────────────────

export type TheorySource = 'ries' | 'trout' | 'ye_maozhong';

export interface TheoryRule {
  id: string;
  theory_source: TheorySource;
  name: string;
  principle: string;
  decision_question: string;
  applicable_context: string[];
  key_variables: string[];
  decision_rules: string[];
  anti_patterns: string[];
  output_implication: string;
  theory_view_tag?: string[];
  // V2 新增
  version?: string;
  created_at?: string;
  updated_at?: string;
  changelog?: Array<{ version: string; date: string; changes: string[] }>;
  deprecated?: boolean;
  superseded_by?: string;
  tags?: string[];
  related_rules?: string[];
  related_challenges?: string[];
  decision_weight?: 'high' | 'medium' | 'low';
  evidence_level?: 'proven' | 'practice' | 'theory';
}

export interface CaseAsset {
  id: string;
  brand_name: string;
  category: string;
  city_context: string;
  market_stage: string;
  project_stage: string;
  initial_problem: string;
  resource_condition: string;
  competition_context: string;
  candidate_positions: string[];
  final_position: string;
  why_choose: string;
  why_not_others: string;
  differentiation_design: string;
  execution_actions: string[];
  market_feedback: string;
  result_summary: string;
  success_or_failure: 'success' | 'failure' | 'mixed';
  quality_tier: 'gold_case' | 'silver_case' | 'bronze_case';
  mental_takeaway: string;
  reusable_principles: string[];
  risk_lessons: string[];
  theory_tags: string[];
  // V2 新增
  version?: string;
  created_at?: string;
  updated_at?: string;
  changelog?: Array<{ version: string; date: string; changes: string[] }>;
  deprecated?: boolean;
  tags?: string[];
  related_rules?: string[];
  related_challenges?: string[];
  related_patterns?: string[];
  decision_chain?: Array<{
    step: string;
    conclusion: string;
    alternatives_considered?: string[];
  }>;
  quantified_impact?: {
    revenue_growth?: string;
    customer_retention?: string;
    market_share?: string;
  };
}

export interface PositioningPattern {
  id: string;
  name: string;
  pattern_type: 'success_pattern' | 'failure_pattern' | 'strategy_pattern';
  summary: string;
  typical_context: string[];
  trigger_signals: string[];
  positioning_formula: string[];
  success_reason: string;
  failure_modes: string[];
  recommended_usage: string;
  not_recommended_when: string[];
  theory_alignment: string[];
  version?: string;
  deprecated?: boolean;
}

export interface ChallengeRule {
  id: string;
  name: string;
  risk_type: string;
  trigger_condition: string[];
  challenge_questions: string[];
  typical_failure_signal: string[];
  severity_level: 'R1' | 'R2' | 'R3' | 'R4';
  elimination_condition: string[];
  mitigation_direction: string[];
  linked_patterns: string[];
  linked_theories: string[];
  version?: string;
  deprecated?: boolean;
}

export interface MentalAsset {
  id: string;
  asset_type: 'mental_keywords' | 'scene_triggers' | 'first_association_terms' | 'price_anchor_terms' | 'emotional_value_terms';
  term: string;
  meaning: string;
  target_customer_tags: string[];
  scene_tags: string[];
  category_tags: string[];
  mental_effect: string[];
  competitor_overlap_level: 'low' | 'medium' | 'high';
  cultural_relevance: string;
  usage_notes: string;
  version?: string;
}

export interface MarketAsset {
  id: string;
  category: string;
  city: string;
  data_type: 'competition_map' | 'white_spots' | 'mental_landscape' | 'price_band';
  leaders?: Array<{ brand: string; position: string; budget?: string; note?: string }>;
  white_spots?: string[];
  price_band?: [number, number];
  saturation?: '极高' | '高' | '中' | '低';
  stage?: '导入期' | '成长期' | '成熟期' | '衰退期';
  mental_keywords?: {
    category_words: string[];
    scene_words: string[];
    value_words: string[];
    emotional_words: string[];
  };
  version?: string;
  updated_at?: string;
  data_confidence?: 'high' | 'medium' | 'low';
  source?: string;
}

export interface KnowledgeIndexEntry {
  from_type: string;
  from_id: string;
  to_type: string;
  to_id: string;
  relation: string;
  strength: 'strong' | 'medium' | 'weak';
  note?: string;
}

export interface KnowledgeQuery {
  theoryIds?: TheorySource[];
  category?: string;
  city?: string;
  scene?: string;
  riskType?: string;
  patternType?: 'success_pattern' | 'failure_pattern' | 'strategy_pattern';
  maxRules?: number;
  maxCases?: number;
  maxPatterns?: number;
  maxChallenges?: number;
}

export interface KnowledgeAssetBundle {
  rules: TheoryRule[];
  cases: CaseAsset[];
  patterns: PositioningPattern[];
  challenges: ChallengeRule[];
  mental: MentalAsset[];
  market: MarketAsset[];
  promptFragments: {
    systemPart: string;
    userPart: string;
  };
}

export interface KnowledgeRelation {
  from: { type: string; id: string };
  to: { type: string; id: string };
  relation: string;
  strength: 'strong' | 'medium' | 'weak';
  note?: string;
}

// ─── 索引查询接口 ─────────────────────────────────────────────

export interface KnowledgeIndexQueries {
  getCasesByRule(ruleId: string): Array<{ caseId: string; strength: string }>;
  getRulesByCase(caseId: string): Array<{ ruleId: string; strength: string }>;
  getRisksByRule(ruleId: string): Array<{ challengeId: string; strength: string }>;
  getPatternsByRisk(challengeId: string): Array<{ patternId: string; strength: string }>;
  getAssetsByTheory(theoryId: TheorySource): {
    rules: string[];
    cases: string[];
    challenges: string[];
    patterns: string[];
  };
}

// ─── 加载器实现 ──────────────────────────────────────────────

export class KnowledgeLoader {
  private baseDir: string;
  private index: KnowledgeIndexEntry[] = [];
  private relations: KnowledgeRelation[] = [];

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(__dirname, '../../knowledge');
  }

  /**
   * 加载所有知识资产和索引
   */
  async loadAll(): Promise<{
    rules: TheoryRule[];
    cases: CaseAsset[];
    patterns: PositioningPattern[];
    challenges: ChallengeRule[];
    mental: MentalAsset[];
    market: MarketAsset[];
    index: KnowledgeIndexEntry[];
  }> {
    const [rules, cases, patterns, challenges, mental, market] = await Promise.all([
      this.loadTheoryRules(),
      this.loadCaseAssets(),
      this.loadPositioningPatterns(),
      this.loadChallengeRules(),
      this.loadMentalAssets(),
      this.loadMarketAssets(),
    ]);

    // 加载索引
    await this.loadIndex();

    return { rules, cases, patterns, challenges, mental, market, index: this.index };
  }

  /**
   * 按理论体系加载知识包
   */
  async loadByTheory(theoryId: TheorySource): Promise<KnowledgeAssetBundle> {
    const all = await this.loadAll();

    const rules = all.rules.filter(r => r.theory_source === theoryId);
    const theoryTags = [theoryId, theoryId === 'ye_maozhong' ? 'ye' : theoryId];
    const cases = all.cases.filter(c =>
      c.theory_tags.some(t => theoryTags.includes(t)),
    );
    const challenges = all.challenges.filter(c =>
      (c.linked_theories || []).includes(theoryId),
    );
    const patterns = all.patterns.filter(p =>
      (p.theory_alignment || []).some(t => theoryTags.includes(t)),
    );

    return {
      rules,
      cases,
      patterns,
      challenges,
      mental: all.mental,
      market: all.market,
      promptFragments: this.buildFragments({ rules, cases, challenges, patterns, mental: all.mental }),
    };
  }

  /**
   * 按品类加载知识包
   */
  async loadForCategory(
    category: string,
    city?: string,
  ): Promise<KnowledgeAssetBundle> {
    const all = await this.loadAll();

    const market = all.market.filter(
      m => matchCategory(m.category, category) && (!city || m.city.includes(city) || city.includes(m.city)),
    );

    const matchedCases = all.cases.filter(
      c => matchCategory(c.category, category),
    );

    // 通过跨资产索引扩展
    const relatedRuleIds = new Set<string>();
    const relatedChallengeIds = new Set<string>();
    for (const c of matchedCases) {
      const ruleLinks = this.getIndexLinks('CaseAsset', c.id, 'TheoryRule');
      ruleLinks.forEach(l => relatedRuleIds.add(l.from_id === c.id ? l.to_id : l.from_id));
      const challengeLinks = this.getIndexLinks('CaseAsset', c.id, 'ChallengeRule');
      challengeLinks.forEach(l => relatedChallengeIds.add(l.from_id === c.id ? l.to_id : l.from_id));
    }

    const rules = all.rules.filter(r => relatedRuleIds.has(r.id));
    const challenges = all.challenges.filter(c => relatedChallengeIds.has(c.id));

    return {
      rules,
      cases: matchedCases,
      patterns: all.patterns,
      challenges,
      mental: all.mental,
      market,
      promptFragments: this.buildFragments({
        rules, cases: matchedCases, challenges, patterns: all.patterns, mental: all.mental,
      }),
    };
  }

  /**
   * 构建 Prompt 片段
   */
  buildPromptFragment(query: KnowledgeQuery): string {
    // 同步加载缓存（简化实现）
    const { rules, cases, challenges, patterns, mental } = this.getSyncCache(query);

    const parts: string[] = [];

    // 理论规则
    if (rules.length > 0) {
      parts.push('【判断规则】');
      for (const rule of rules.slice(0, query.maxRules || 5)) {
        parts.push(`■ ${rule.name}（${rule.theory_source}）`);
        parts.push(`  原理：${rule.principle}`);
        for (const d of rule.decision_rules.slice(0, 3)) {
          parts.push(`  · ${d}`);
        }
        if (rule.anti_patterns.length > 0) {
          parts.push(`  禁止：${rule.anti_patterns.slice(0, 2).join('；')}`);
        }
        parts.push('');
      }
    }

    // 参考案例
    if (cases.length > 0) {
      parts.push('【参考案例】');
      for (const c of cases.slice(0, query.maxCases || 3)) {
        const tag = c.success_or_failure === 'success' ? '✓' : '✗';
        parts.push(`■ ${tag} ${c.brand_name}（${c.category}·${c.city_context}）`);
        parts.push(`  初始问题：${c.initial_problem}`);
        parts.push(`  最终定位：${c.final_position}`);
        parts.push(`  选择理由：${c.why_choose}`);
        if (c.reusable_principles.length > 0) {
          parts.push(`  可复用：${c.reusable_principles.slice(0, 2).join('；')}`);
        }
        parts.push('');
      }
    }

    // 风险提醒
    if (challenges.length > 0 && query.riskType) {
      parts.push('【相关风险】');
      for (const ch of challenges.slice(0, 3)) {
        parts.push(`  ${ch.severity_level} ${ch.name}：${ch.challenge_questions[0] || ''}`);
      }
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * 获取索引查询接口
   */
  getIndexQueries(): KnowledgeIndexQueries {
    return {
      getCasesByRule: (ruleId) =>
        this.getIndexLinks('TheoryRule', ruleId, 'CaseAsset')
          .filter(l => l.relation === 'supports')
          .map(l => ({ caseId: l.to_id, strength: l.strength })),

      getRulesByCase: (caseId) =>
        this.getIndexLinks('CaseAsset', caseId, 'TheoryRule')
          .map(l => ({ ruleId: l.to_id, strength: l.strength })),

      getRisksByRule: (ruleId) =>
        this.getIndexLinks('TheoryRule', ruleId, 'ChallengeRule')
          .filter(l => l.relation === 'triggers')
          .map(l => ({ challengeId: l.to_id, strength: l.strength })),

      getPatternsByRisk: (challengeId) =>
        this.getIndexLinks('ChallengeRule', challengeId, 'PositioningPattern')
          .filter(l => l.relation === 'mitigated_by')
          .map(l => ({ patternId: l.to_id, strength: l.strength })),

      getAssetsByTheory: (theoryId) => {
        const links = this.relations.filter(
          r => (r.from.type === 'TheoryRule' || r.to.type === 'TheoryRule'),
        );
        const ruleIds = new Set<string>();
        const caseIds = new Set<string>();
        const challengeIds = new Set<string>();
        const patternIds = new Set<string>();

        for (const l of links) {
          const rule = l.from.type === 'TheoryRule' ? l.from : (l.to.type === 'TheoryRule' ? l.to : null);
          if (rule) ruleIds.add(rule.id);
          if (l.from.type === 'CaseAsset') caseIds.add(l.from.id);
          if (l.to.type === 'CaseAsset') caseIds.add(l.to.id);
          if (l.from.type === 'ChallengeRule') challengeIds.add(l.from.id);
          if (l.to.type === 'ChallengeRule') challengeIds.add(l.to.id);
          if (l.from.type === 'PositioningPattern') patternIds.add(l.from.id);
          if (l.to.type === 'PositioningPattern') patternIds.add(l.to.id);
        }

        return {
          rules: [...ruleIds],
          cases: [...caseIds],
          challenges: [...challengeIds],
          patterns: [...patternIds],
        };
      },
    };
  }

  // ─── 内部方法 ───────────────────────────────────────────────

  private async loadIndex(): Promise<void> {
    const indexPath = path.join(this.baseDir, '_index.yaml');
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf-8');
      // 简单 YAML 解析（生产环境应使用 js-yaml）
      this.index = this.parseYamlRelations(content);
      this.relations = this.index.map(e => ({
        from: { type: e.from_type, id: e.from_id },
        to: { type: e.to_type, id: e.to_id },
        relation: e.relation,
        strength: e.strength,
        note: e.note,
      }));
    }
  }

  private getIndexLinks(
    fromType: string,
    fromId: string,
    toType: string,
  ): Array<{ from_id: string; to_id: string; relation: string; strength: string }> {
    return this.index.filter(
      e => e.from_type === fromType && e.from_id === fromId && e.to_type === toType,
    ).concat(
      this.index.filter(
        e => e.to_type === fromType && e.to_id === fromId && e.from_type === toType,
      ).map(e => ({ ...e, from_id: e.to_id, to_id: e.from_id })),
    );
  }

  private getSyncCache(query: KnowledgeQuery): {
    rules: TheoryRule[];
    cases: CaseAsset[];
    challenges: ChallengeRule[];
    patterns: PositioningPattern[];
    mental: MentalAsset[];
  } {
    // V2 简化实现：从内嵌知识加载
    // 完整实现应缓存 loadAll() 的结果
    return {
      rules: [],
      cases: [],
      challenges: [],
      patterns: [],
      mental: [],
    };
  }

  private buildFragments(bundle: {
    rules: TheoryRule[];
    cases: CaseAsset[];
    challenges: ChallengeRule[];
    patterns: PositioningPattern[];
    mental: MentalAsset[];
  }): { systemPart: string; userPart: string } {
    const rulePart = bundle.rules.slice(0, 5).map(r =>
      `【${r.name}】${r.principle}\n· ${r.decision_rules.slice(0, 2).join('\n· ')}`,
    ).join('\n');

    const casePart = bundle.cases.slice(0, 3).map(c =>
      `【${c.brand_name}】${c.final_position}\n→ ${c.why_choose}`,
    ).join('\n');

    return {
      systemPart: rulePart,
      userPart: casePart,
    };
  }

  private parseYamlRelations(content: string): KnowledgeIndexEntry[] {
    // 简易 YAML 解析（只解析 relations 数组）
    // 生产环境应使用 js-yaml
    const entries: KnowledgeIndexEntry[] = [];
    const lines = content.split('\n');
    let inRelations = false;
    let current: Partial<KnowledgeIndexEntry> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === 'relations:') {
        inRelations = true;
        continue;
      }

      if (!inRelations) continue;

      if (trimmed.startsWith('- from_type:')) {
        if (current && current.from_type) {
          entries.push(current as KnowledgeIndexEntry);
        }
        current = { from_type: trimmed.split(':')[1].trim() };
      } else if (current && trimmed.startsWith('from_id:')) {
        current.from_id = trimmed.split(':')[1].trim();
      } else if (current && trimmed.startsWith('to_type:')) {
        current.to_type = trimmed.split(':')[1].trim();
      } else if (current && trimmed.startsWith('to_id:')) {
        current.to_id = trimmed.split(':')[1].trim();
      } else if (current && trimmed.startsWith('relation:')) {
        current.relation = trimmed.split(':')[1].trim();
      } else if (current && trimmed.startsWith('strength:')) {
        current.strength = trimmed.split(':')[1].trim() as any;
      } else if (current && trimmed.startsWith('note:')) {
        current.note = trimmed.substring(trimmed.indexOf(':') + 1).trim().replace(/^"|"$/g, '');
      }
    }

    if (current && current.from_type) {
      entries.push(current as KnowledgeIndexEntry);
    }

    return entries;
  }

  /**
   * 内嵌知识作为回退源（V1 兼容）
   */
  loadInlineRules(rules: TheoryRule[]): void {
    // 保留接口，V1 迁移期间使用
  }

  loadInlineCases(cases: CaseAsset[]): void {
    // 保留接口，V1 迁移期间使用
  }

  /**
   * 加载内置知识种子（原 seeds.ts 内容）
   * V2: seeds.ts 已废弃，统一由 _loader.ts 加载。
   */
  loadSeeds(): MPntKnowledgeSeed[] {
    // 内嵌知识种子数据（迁移自 knowledge/seeds.ts）
    return getBuiltinSeeds();
  }
}

// ─── 工具函数 ─────────────────────────────────────────────────

function matchCategory(a: string, b: string): boolean {
  return a.includes(b) || b.includes(a);
}

// ─── 内置知识种子（迁移自 knowledge/seeds.ts） ──────────────

export interface MPntKnowledgeSeed {
  id: string;
  type: "FACT" | "RULE" | "CASE" | "MODEL" | "EXPERIENCE";
  title: string;
  category: string;
  content: Record<string, unknown>;
  scenario: string[];
  confidence: number;
  source: string;
  tags: string[];
}

/**
 * 内置知识种子数据（原 seeds.ts）
 * @deprecated 直接调用 KnowledgeLoader.loadSeeds()
 */
function getBuiltinSeeds(): MPntKnowledgeSeed[] {
  return [
    {
      id: "CAT-BENCH-001",
      type: "FACT",
      title: "湘菜品类基准",
      category: "品类知识",
      content: { question: "湘菜的市场基准是什么？", answer: "湘菜全国门店体量大体集中在湖南、广东、浙江等餐饮活跃区。客单价常见 60-120 元，食材成本率约 32-38%，翻台约 2.0-3.5。口味记忆强，标准化中等。", conditions: [{ field: "category", operator: "=", value: "湘菜" }] },
      scenario: ["品类分析", "价格定位"],
      confidence: 0.85,
      source: "industry_benchmark_bundle",
      tags: ["湘菜", "品类基准", "经营指标"],
    },
    {
      id: "PRICE-RULE-001",
      type: "RULE",
      title: "中餐价格带判断",
      category: "价格定位",
      content: { question: "如何判断中餐品类的合适价格带？", conditions: [{ field: "category", operator: "in", value: ["湘菜", "川菜", "粤菜", "家常菜"] }, { field: "city_tier", operator: "in", value: ["一线", "新一线"] }], judgement: "一线/新一线中餐客单价基准常见 60-120 元", recommendation: "默认中端 80-100 元区间覆盖最大客群，上探需品牌力", risk: "高于 120 元需证明心智与体验溢价" },
      scenario: ["价格定位", "投资评估"],
      confidence: 0.85,
      source: "industry_benchmark",
      tags: ["价格带", "中餐", "规则"],
    },
    {
      id: "COMP-SAT-001",
      type: "MODEL",
      title: "品类饱和度粗判",
      category: "竞争分析",
      content: { question: "如何粗判区域品类饱和度？", rules: [{ max: 5, label: "蓝海" }, { max: 10, label: "适度竞争" }, { max: 20, label: "饱和竞争" }, { max: Infinity, label: "红海" }], unit: "stores_per_10k_population" },
      scenario: ["竞争分析", "品类分析"],
      confidence: 0.75,
      source: "positioning_framework",
      tags: ["饱和度", "竞争"],
    },
    {
      id: "POS-EXP-001",
      type: "EXPERIENCE",
      title: "客群过宽是第一陷阱",
      category: "定位经验",
      content: { principle: "目标客群不能是所有人", judgement: "说不清谁会反复想起你，定位尚未成立", action: "用场景句收窄：什么人、在什么场合、因为什么选你" },
      scenario: ["客群画像", "差异化策略"],
      confidence: 0.9,
      source: "m-pnt_theory_rules",
      tags: ["心智客户", "陷阱"],
    },
    {
      id: "MATRIX-RULE-001",
      type: "RULE",
      title: "三理论禁止平均整合",
      category: "三理论矩阵",
      content: { rule: "Cross-Fire 后必须取舍，不得平均三票", decision_layer: "decision_recommend = primary|secondary|backup|reject", hard: ["R4 不得 primary", "最终权在 Synthesis"] },
      scenario: ["差异化策略", "定位决策"],
      confidence: 0.95,
      source: "m-pnt_agent_matrix_v1",
      tags: ["Ries", "Trout", "Ye", "Synthesis"],
    },
  ];
}

// ─── 单例 ─────────────────────────────────────────────────────

let defaultLoader: KnowledgeLoader | null = null;

export function getKnowledgeLoader(baseDir?: string): KnowledgeLoader {
  if (!defaultLoader) {
    defaultLoader = new KnowledgeLoader(baseDir);
  }
  return defaultLoader;
}

export function resetKnowledgeLoader(): void {
  defaultLoader = null;
}
