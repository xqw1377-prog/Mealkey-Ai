"""
文档生成 Handler

使用 handler_wrapper 消除重复的模板代码。
规则退路从 agent/knowledge/rules/document 加载。
"""

from agent.models.schemas import GenerateDocumentPayload
from agent.utils.llm import LLMEngine, DOCUMENT_PROMPT_TEMPLATE, build_context_section
from agent.handlers import handler_wrapper
from agent.knowledge.rules.document import document_fallback


def _build_document_prompt_vars(validated: GenerateDocumentPayload) -> dict:
    """构造文档生成的 Prompt 变量"""
    return {
        "document_type": validated.document_type.value,
        "scheme_version": validated.scheme_version,
        "scheme_data": str(validated.scheme_data),
        "output_format": validated.output_format.value,
    }


def _document_fallback(validated: GenerateDocumentPayload) -> dict:
    """文档生成的规则引擎退路 — 委托到 knowledge 模块"""
    return document_fallback(validated)


@handler_wrapper(
    payload_model=GenerateDocumentPayload,
    prompt_template=DOCUMENT_PROMPT_TEMPLATE,
    fallback_fn=_document_fallback,
    prompt_builder=_build_document_prompt_vars,
)
def handle_generate_document(payload: dict, llm: LLMEngine, context: dict | None,
                             validated: GenerateDocumentPayload, result: dict) -> dict:
    """文档生成 — 后处理（补充免责声明）"""
    result.setdefault("document", {})
    if "disclaimer" not in result["document"]:
        result["document"]["disclaimer"] = (
            "本文件为 AI 生成的参考草案，不构成法律意见。建议在签署前由专业律师审查。"
        )
    return result
