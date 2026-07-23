/**
 * Memory Extractor - 智能记忆提取器
 *
 * 升级：接入 LLM 驱动提取，规则为降级路径
 *
 * 从对话中提取关键信息，判断是否值得保存
 */

import type {
  MemoryItem,
  MemoryLayer,
  MemoryScore,
  MemoryExtractor,
  Conversation,
} from "./types";

// ─── LLM 接口 ───

export interface ExtractorLLMAdapter {
  chat(params: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
  }): Promise<{ content: string }>;
}

// ─── 提取规则（降级路径）───

interface ExtractionRule {
  layer: MemoryLayer;
  patterns: RegExp[];
  importance: number;
  confidence: number;
  tags: string[];
}

const EXTRACTION_RULES: ExtractionRule[] = [
  {
    layer: "user",
    patterns: [
      /(\d+)\s*年.*经验/,
      /擅长.*管理/,
      /曾经.*做.*过/,
      /厨师出身/,
      /连锁.*经验/,
    ],
    importance: 0.9,
    confidence: 0.8,
    tags: ["capability", "experience"],
  },
  {
    layer: "preference",
    patterns: [
      /喜欢.*风格/,
      /偏好.*类型/,
      /倾向于/,
      /稳健/,
      /激进/,
      /保守/,
    ],
    importance: 0.7,
    confidence: 0.7,
    tags: ["preference"],
  },
  {
    layer: "decision",
    patterns: [
      /决定.*是否/,
      /选择.*还是/,
      /要不要/,
      /是否应该/,
      /最终.*决定/,
    ],
    importance: 0.8,
    confidence: 0.9,
    tags: ["decision"],
  },
  {
    layer: "failure",
    patterns: [
      /失败/,
      /亏损/,
      /关店/,
      /做错了/,
      /后悔/,
      /教训/,
    ],
    importance: 0.9,
    confidence: 0.9,
    tags: ["failure", "learning"],
  },
  {
    layer: "insight",
    patterns: [
      /明白了/,
      /理解了/,
      /认识到/,
      /原来/,
      /关键在于/,
      /核心是/,
    ],
    importance: 0.8,
    confidence: 0.7,
    tags: ["insight", "learning"],
  },
  {
    layer: "project",
    patterns: [
      /定位.*调整/,
      /策略.*改变/,
      /发现.*风险/,
      /取得.*结果/,
      /阶段.*进入/,
    ],
    importance: 0.6,
    confidence: 0.8,
    tags: ["project", "status"],
  },
];

// ─── Memory Extractor 实现 ───

export class DefaultMemoryExtractor implements MemoryExtractor {
  constructor(private llm?: ExtractorLLMAdapter) {}

  /**
   * 从对话中提取记忆
   * LLM 优先，规则降级
   */
  extract(conversation: Conversation): MemoryItem[] {
    // 1. 优先使用 LLM 提取
    if (this.llm) {
      try {
        return this.extractWithLLM(conversation);
      } catch {
        // LLM 失败，降级到规则
      }
    }

    // 2. 降级：规则提取
    return this.extractWithRules(conversation);
  }

  /**
   * LLM 驱动提取
   */
  private extractWithLLM(conversation: Conversation): MemoryItem[] {
    // 只分析用户消息（AI 消息不需要提取记忆）
    const userMessages = conversation.messages
      .filter(m => m.role === "user")
      .map(m => m.content);

    if (userMessages.length === 0) return [];

    // 批量分析最近消息（最多 5 条）
    const recentMessages = userMessages.slice(-5);
    const conversationText = recentMessages
      .map((msg, i) => `用户${i + 1}: ${msg}`)
      .join("\n");

    const prompt = `你是 MealKey 记忆提取专家。从以下对话中提取值得记住的信息。

对话内容:
${conversationText}

请分析并提取以下类型的记忆（如果没有则返回空数组）:
1. user: 用户的能力和经验（如"10年餐饮经验"）
2. preference: 用户的偏好和倾向（如"喜欢稳健投资"）
3. decision: 用户的关键决策（如"决定做湘菜"）
4. failure: 用户的失败经验（如"上次亏损了"）
5. insight: 用户的认知提升（如"明白了选址比装修重要"）
6. project: 项目状态变化（如"进入筹备阶段"）

输出JSON格式:
{
  "memories": [
    {
      "layer": "user|preference|decision|failure|insight|project",
      "value": "提取的具体内容",
      "importance": 0.8,
      "confidence": 0.9,
      "tags": ["tag1", "tag2"]
    }
  ]
}`;

    // 使用同步方式调用 LLM（保证 extract 接口签名不变）
    // MemoryEngine.extractAndSave 是 async 的，但 extract 是同步接口
    // 所以我们在这里启动异步任务，同步返回规则提取结果
    // LLM 结果将通过回调或后续的 saveLLMResults 方法保存
    
    // 启动异步 LLM 提取
    this.llm!.chat({
      messages: [
        { role: "system", content: "你是 MealKey 记忆提取专家。只输出JSON。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }).then(response => {
      try {
        const parsed = JSON.parse(response.content);
        const memories = (parsed.memories ?? []) as Array<{
          layer: string;
          value: string;
          importance: number;
          confidence: number;
          tags: string[];
        }>;
        
        // 保存到 storage（通过全局回调或事件）
        if (this.onLLMMemories && memories.length > 0) {
          this.onLLMMemories(conversation.userId, conversation.projectId, memories);
        }
      } catch {
        // LLM 解析失败，忽略
      }
    }).catch(() => {
      // LLM 调用失败，忽略
    });

    // 同步返回规则提取结果
    return this.extractWithRules(conversation);
  }

  /** LLM 记忆提取完成的回调（由外部设置） */
  onLLMMemories?: (
    userId: string,
    projectId: string | undefined,
    memories: Array<{ layer: string; value: string; importance: number; confidence: number; tags: string[] }>
  ) => void;

  /**
   * 规则提取（降级路径）
   */
  private extractWithRules(conversation: Conversation): MemoryItem[] {
    const memories: MemoryItem[] = [];

    for (const message of conversation.messages) {
      if (message.role === "assistant") {
        const extracted = this.extractFromMessage(
          conversation.userId,
          conversation.projectId,
          message.content
        );
        memories.push(...extracted);
      }
    }

    return memories;
  }

  /**
   * 判断是否值得保存
   */
  shouldSave(item: MemoryItem): boolean {
    const score = this.calculateWeight(item);
    if (score.weight < 0.3) return false;
    if (item.tags.includes("temporary")) return false;
    return true;
  }

  /**
   * 计算记忆权重
   */
  calculateWeight(item: MemoryItem): MemoryScore {
    const daysSinceCreation = (Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recency = Math.exp(-daysSinceCreation / 30);
    const importance = item.importance;
    const confidence = item.confidence;
    const weight = importance * confidence * recency;

    return { importance, confidence, recency, weight };
  }

  /**
   * 从消息中提取记忆（规则模式）
   */
  private extractFromMessage(
    userId: string,
    projectId: string | undefined,
    content: string
  ): MemoryItem[] {
    const memories: MemoryItem[] = [];

    for (const rule of EXTRACTION_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(content)) {
          const memory = this.createMemory(
            userId,
            projectId,
            rule.layer,
            content,
            rule.importance,
            rule.confidence,
            rule.tags
          );
          if (this.shouldSave(memory)) {
            memories.push(memory);
          }
        }
      }
    }

    return memories;
  }

  /**
   * 创建记忆对象
   */
  private createMemory(
    userId: string,
    projectId: string | undefined,
    layer: MemoryLayer,
    content: string,
    importance: number,
    confidence: number,
    tags: string[]
  ): MemoryItem {
    const now = new Date();
    return {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      layer,
      userId,
      projectId,
      key: `${layer}_${Date.now()}`,
      value: { content, extractedAt: now.toISOString() },
      context: content.slice(0, 200),
      importance,
      confidence,
      recency: 1.0,
      source: "ai",
      tags,
      createdAt: now,
      updatedAt: now,
    };
  }
}
