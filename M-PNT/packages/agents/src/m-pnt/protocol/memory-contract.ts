/**
 * M-PNT Memory Contract V1
 *
 * 标准化定位决策的记忆回写格式。
 * 消费 Frozen Protocol 的 MemoryEngineLike.saveDecision() 接口。
 */
import type { MemoryEngineLike, MKDecision } from "@mealkey/agent-sdk";

// ─── 记忆条目类型 ─────────────────────────────────────────────

export interface PositioningMemoryEntry {
  /** 记忆类型标识 */
  type: 'positioning_decision';
  /** 契约版本 */
  version: '1.0';
  
  /** 定位结论 */
  summary: string;
  decision_recommend: 'primary' | 'secondary' | 'backup' | 'reject';
  overall_score: number;
  mind_position_level: 'A' | 'B' | 'C' | 'D';
  max_risk_severity: 'R1' | 'R2' | 'R3' | 'R4';
  
  /** 三理论投票 */
  theory_vote: {
    ries: { preferred: string; theory_recommend: string };
    trout: { preferred: string; theory_recommend: string };
    ye_maozhong: { preferred: string; theory_recommend: string };
  };
  
  /** 验证状态 */
  validation_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  next_review_date?: string;
  
  /** 版本追踪 */
  position_version: number;
  previous_version_summary?: string;
  
  /** 时间戳 */
  created_at: string;
}

// ─── Memory 写入器 ────────────────────────────────────────────

export class PositioningMemoryWriter {
  private memoryEngine?: MemoryEngineLike;
  private versionCounter = 0;

  constructor(memoryEngine?: MemoryEngineLike) {
    this.memoryEngine = memoryEngine;
  }

  /**
   * 从 MKDecision 构建记忆条目
   */
  buildEntry(
    decision: MKDecision,
    theoryVote?: {
      ries: { preferred: string; theory_recommend: string };
      trout: { preferred: string; theory_recommend: string };
      ye_maozhong: { preferred: string; theory_recommend: string };
    },
    previousSummary?: string,
  ): PositioningMemoryEntry {
    this.versionCounter++;

    // 尝试从 evidence 提取结构化数据
    const structured = this.extractStructured(decision);

    return {
      type: 'positioning_decision',
      version: '1.0',
      summary: structured.summary || decision.judgement || '',
      decision_recommend: (structured.decision_recommend as any) || 'primary',
      overall_score: structured.overall_score ?? 65,
      mind_position_level: (structured.mind_position_level as any) || 'B',
      max_risk_severity: (structured.max_risk_severity as any) || 'R2',
      theory_vote: theoryVote || {
        ries: { preferred: '', theory_recommend: 'neutral' },
        trout: { preferred: '', theory_recommend: 'neutral' },
        ye_maozhong: { preferred: '', theory_recommend: 'neutral' },
      },
      validation_status: 'pending',
      position_version: this.versionCounter,
      previous_version_summary: previousSummary,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * 保存记忆条目
   */
  async save(
    projectId: string,
    agentId: string,
    entry: PositioningMemoryEntry,
  ): Promise<void> {
    if (!this.memoryEngine) return;

    try {
      await this.memoryEngine.saveDecision(projectId, agentId, {
        type: entry.type,
        summary: entry.summary,
        reasoning: `推荐: ${entry.decision_recommend} | 评分: ${entry.overall_score} | 等级: ${entry.mind_position_level} | 风险: ${entry.max_risk_severity}`,
        confidence: entry.overall_score / 100,
      });
    } catch {
      // 记忆写入失败不阻断主流程
    }
  }

  private extractStructured(decision: MKDecision): Record<string, unknown> {
    const structured = decision.evidence.find(e => e.source === "structured");
    if (!structured) return {};
    try {
      return JSON.parse(structured.content) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
