"""
M-ED 股权决策 Agent — LLM 引擎封装

职责：
  - 统一 LLM 调用接口（支持 GPT-4 / Claude）
  - Prompt 模板管理
  - 输出解析与校验
  - 退路机制（LLM 不可用时使用规则引擎）

注意：规则引擎退路逻辑已迁移到 agent/knowledge/rules/，
      handler_wrapper 在 LLM 调用失败时自动降级调用。
"""

import json
import os
import re
import logging
from typing import Optional, Callable, Any
from functools import lru_cache

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

try:
    from anthropic import Anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

logger = logging.getLogger(__name__)


# ============================================================
# Prompt 模板
# ============================================================

SYSTEM_PROMPT = """你是一个专业的股权决策顾问，名为 M-ED Equity Agent。
你的职责是根据用户提供的项目信息，给出股权结构设计、分配方案、动态调整建议、合规检查或文档生成等专业建议。

【核心原则】
1. 所有建议必须基于用户提供的数据，不要凭空假设
2. 输出必须结构清晰，包含推理过程
3. 必须包含风险提示和免责声明
4. 使用中文输出，专业术语可保留英文
5. 涉及法律问题时，必须声明"建议咨询专业律师"

【输出格式要求】
始终使用 JSON 格式输出，确保数据结构完整可解析。"""


DESIGN_EQUITY_PROMPT_TEMPLATE = """
请根据以下项目信息设计股权分配方案：

项目名称: {project_name}
项目阶段: {project_stage}
团队成员:
{team_members}

附加信息: {additional_info}

{context_section}

请输出包含以下结构的 JSON：
1. scheme: 分配方案详情（allocations, reserved_pool, unallocated, summary）
2. analysis: 优势、风险、建议
3. 确保所有比例合计为 100%
"""


ADJUST_EQUITY_PROMPT_TEMPLATE = """
请根据以下信息提出股权调整建议：

当前方案: {current_scheme}
触发事件: {trigger_event}
贡献记录: {contributions}
调整类型: {adjustment_type}

{context_section}

请输出包含以下结构的 JSON：
1. adjustment_suggestion: 调整详情
2. impact_analysis: 影响分析
3. recommendations: 操作建议
"""


SIMULATE_PROMPT_TEMPLATE = """
请模拟以下场景的股权演变：

基础方案: {base_scheme}
场景列表: {scenarios}

{context_section}

请输出每个场景的详细演算结果和分析洞察。
"""


COMPLIANCE_PROMPT_TEMPLATE = """
请对以下股权方案进行合规性审查：

方案: {scheme}
管辖地: {jurisdiction}
检查项目: {check_items}

{context_section}

请输出每个检查项目的状态（pass/warn/fail）、详细说明和建议。
"""


DOCUMENT_PROMPT_TEMPLATE = """
请根据以下方案数据生成股权文档：

文档类型: {document_type}
方案版本: {scheme_version}
方案数据: {scheme_data}
输出格式: {output_format}

{context_section}

请输出完整的文档内容。
"""


# ============================================================
# LLM 引擎
# ============================================================

class LLMEngine:
    """
    LLM 引擎封装。

    支持两种模式：
      1. LLM 模式：调用 GPT-4 / Claude 等大模型
      2. 回退模式：LLM 不可用时使用规则引擎（由 handler_wrapper 触发）
    """

    _FALLBACK_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]  # 当前环境可用的候选模型

    def __init__(self, model: str = "gpt-4", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        self._llm_available = bool(self.api_key or self.anthropic_api_key)

    def is_available(self) -> bool:
        """检查 LLM 是否可用"""
        return self._llm_available

    def generate(
        self,
        prompt_template: str,
        **kwargs,
    ) -> dict:
        """
        生成 LLM 响应。

        Args:
            prompt_template: Prompt 模板
            **kwargs: 模板变量

        Returns:
            解析后的 JSON 响应

        Raises:
            RuntimeError: 未配置 API Key
            Exception: LLM 调用失败
        """
        if not self._llm_available:
            raise RuntimeError(
                "LLM 引擎未配置 API Key，请设置 OPENAI_API_KEY 或 ANTHROPIC_API_KEY 环境变量"
            )

        prompt = prompt_template.format(**kwargs)

        try:
            response = self._call_llm(prompt)
            return self._parse_response(response)

        except Exception as e:
            logger.error(f"LLM 调用失败: {e}")
            raise

    def _call_llm(self, prompt: str) -> str:
        """实际的 LLM API 调用（支持 OpenAI / Anthropic）"""
        if self.model.startswith("gpt") and HAS_OPENAI:
            return self._call_openai(prompt)
        elif self.model.startswith("claude") and HAS_ANTHROPIC:
            return self._call_anthropic(prompt)
        else:
            raise RuntimeError(
                f"不支持的模型 '{self.model}' 或缺少对应 SDK。"
                f"安装 openai: pip install openai | anthropic: pip install anthropic"
            )

    def _call_openai(self, prompt: str) -> str:
        """调用 OpenAI API"""
        client = OpenAI(api_key=self.api_key)
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            error_str = str(e)
            # model_not_found 说明模型不可用，抛出去让 handler_wrapper 降级
            if "model_not_found" in error_str or "Model not found" in error_str:
                raise RuntimeError(f"模型 '{self.model}' 在当前环境不可用: {e}")
            raise

    def _call_anthropic(self, prompt: str) -> str:
        """调用 Anthropic API"""
        client = Anthropic(api_key=self.anthropic_api_key)
        response = client.messages.create(
            model=self.model,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=4096,
        )
        return response.content[0].text

    def _parse_response(self, response: str) -> dict:
        """解析 LLM 返回的 JSON"""
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response)
            if match:
                return json.loads(match.group(1))
            raise

    def _mock_response(self, prompt: str) -> dict:
        """开发阶段模拟响应"""
        return {
            "mock": True,
            "message": "LLM 引擎返回模拟数据（开发模式）",
            "prompt_snippet": prompt[:200],
        }


# ============================================================
# 工厂函数
# ============================================================

def create_llm_engine() -> LLMEngine:
    """创建 LLM 引擎实例"""
    return LLMEngine()


def build_context_section(context: Optional[dict]) -> str:
    """将会话上下文格式化为 prompt 注入段落"""
    if not context:
        return ""
    parts = []
    lang = context.get("language", "zh-CN")
    if lang and lang != "zh-CN":
        parts.append(f"【输出语言】{lang}")
    if context.get("has_current_scheme"):
        scheme = context.get("current_scheme")
        if scheme:
            parts.append(f"【当前方案】\n{json.dumps(scheme, ensure_ascii=False, indent=2)}")
    team = context.get("team_members", [])
    if team:
        members = ", ".join(f"{m['name']}({m['role']})" for m in team)
        parts.append(f"【已知团队成员】{members}")
    history = context.get("recent_history", [])
    if history:
        hist = "; ".join(f"{h['action']}({h['summary'][:30]})" for h in history)
        parts.append(f"【最近操作】{hist}")
    if not parts:
        return ""
    return "【会话上下文】\n" + "\n".join(parts)
