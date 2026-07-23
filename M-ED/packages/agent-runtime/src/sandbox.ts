/**
 * AgentSandbox — Agent 安全执行环境
 *
 * 每个 Agent 在沙箱中运行：
 * - 独立的 Context 副本（不能修改原始数据）
 * - 执行超时限制
 * - Token 预算限制
 * - 输出大小限制
 * - 错误隔离
 */

import type { MKContext, MKDecision, AgentManifest } from "@mealkey/agent-sdk";

export interface SandboxConfig {
  /** 执行超时 ms */
  timeoutMs: number;
  /** 最大 token 数 */
  maxTokens: number;
  /** 最大输出长度字符 */
  maxOutputLength: number;
  /** 是否允许产生 Mission */
  allowMissions: boolean;
}

export interface SandboxResult {
  success: boolean;
  decision?: MKDecision;
  error?: string;
  duration: number;
  tokens: number;
  truncated: boolean;
}

const DEFAULT_CONFIG: SandboxConfig = {
  timeoutMs: 30000,
  maxTokens: 4096,
  maxOutputLength: 10000,
  allowMissions: true,
};

export class AgentSandbox {
  private config: SandboxConfig;

  constructor(config?: Partial<SandboxConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 在沙箱中执行 Agent
   */
  async execute(
    manifest: AgentManifest,
    context: MKContext,
    executor: (ctx: MKContext) => Promise<MKDecision>
  ): Promise<SandboxResult> {
    const startTime = Date.now();

    try {
      // 创建 Context 副本（防止修改原始数据）
      const sandboxContext = this.isolateContext(context);

      // 带超时执行
      const decision = await this.withTimeout(
        executor(sandboxContext),
        this.config.timeoutMs
      );

      // 检查输出大小
      const outputStr = JSON.stringify(decision);
      const truncated = outputStr.length > this.config.maxOutputLength;

      return {
        success: true,
        decision: truncated ? this.truncateDecision(decision) : decision,
        duration: Date.now() - startTime,
        tokens: 0, // 由调用方填充
        truncated,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        tokens: 0,
        truncated: false,
      };
    }
  }

  /**
   * 隔离 Context — 深拷贝，防止 Agent 修改原始数据
   */
  private isolateContext(context: MKContext): MKContext {
    return JSON.parse(JSON.stringify(context));
  }

  /**
   * 带超时的 Promise
   */
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Agent 执行超时 (${ms}ms)`));
      }, ms);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 截断过长的 Decision
   */
  private truncateDecision(decision: MKDecision): MKDecision {
    return {
      ...decision,
      observation: decision.observation.slice(0, 500),
      diagnosis: decision.diagnosis.slice(0, 500),
      judgement: decision.judgement.slice(0, 500),
      strategy: decision.strategy.slice(0, 500),
      action: decision.action.slice(0, 500),
      evidence: decision.evidence.slice(0, 5),
    };
  }
}
