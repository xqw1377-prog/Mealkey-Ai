"""
文档生成 — 规则知识资产

4 类文档模板规则，从 handler/document.py 的 _document_fallback 抽取。
"""

from datetime import datetime, timezone
from agent.knowledge.audit import AuditTracker


def document_fallback(validated, tracker: AuditTracker | None = None) -> dict:
    """
    文档生成规则引擎退路 — 模板框架

    Args:
        validated: GenerateDocumentPayload 实例
        tracker: 可选的审计追踪器

    Returns:
        文档内容 dict
    """
    t = tracker or AuditTracker("generate_document")

    project_name = validated.scheme_data.get("project_name", "项目")
    parties = validated.scheme_data.get("parties", [])
    doc_date = validated.scheme_data.get("date", "____年__月__日")

    t.trace("start", "parse",
            f"生成 {validated.document_type.value}, 项目={project_name}, {len(parties)} 方",
            doc_type=validated.document_type.value, project=project_name,
            parties_count=len(parties))

    content = f"""# {project_name} 股权分配协议（草案）

## 一、协议主体

本协议由以下各方于 {doc_date} 共同签署：

"""
    for p in parties:
        content += f"- {p.get('name', '______')}（{p.get('role', '______')}，持股 {p.get('equity_percent', '____')}%）\n"

    content += """
## 二、股权分配

...（详细条款待 LLM 生成）...

---

> **免责声明**：本文件为 AI 生成的参考草案，不构成法律意见。
"""

    t.trace("result", "generated",
            f"文档长度={len(content)} 字符, 格式={validated.output_format.value}",
            content_length=len(content), format=validated.output_format.value)

    return {
        "document": {
            "title": f"{project_name} 股权分配协议（草案）",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "content": content,
            "format": validated.output_format.value,
            "disclaimer": "本文件为 AI 生成的参考草案，不构成法律意见。建议在签署前由专业律师审查。",
        },
        "download_links": {},
        "metadata": {
            "model": "rule_engine",
            "fallback": True,
            "audit": t.summary(),
        },
    }
