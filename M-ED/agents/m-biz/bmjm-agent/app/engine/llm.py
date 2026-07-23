"""LLM 集成层 — 调用 MealKey 配置的模型能力"""

import json
import structlog
from typing import Optional
from pydantic import BaseModel, Field
from app.config import settings

logger = structlog.get_logger()

# ============================================================
# 模型配置（由 MealKey 上层注入）
# ============================================================

class LLMConfig(BaseModel):
    """LLM 配置"""
    provider: str = Field(default="openai", description="模型提供商")
    model: str = Field(default="gpt-4o-mini", description="模型名称")
    api_key: str = Field(default="", description="API Key")
    api_base: str = Field(default="", description="API 基础地址")
    max_tokens: int = Field(default=1024, description="最大 Token 数")
    temperature: float = Field(default=0.7, description="温度参数")


# ============================================================
# LLM 客户端
# ============================================================

class LLMClient:
    """LLM 客户端 — 供 ECC 调用"""

    def __init__(self, config: Optional[LLMConfig] = None):
        self.config = config or self._load_config()
        self._client = None
        logger.info("LLM client initialized", provider=self.config.provider, model=self.config.model)

    def _load_config(self) -> LLMConfig:
        """从环境变量加载配置（由 MealKey 在启动时设置）"""
        import os
        return LLMConfig(
            provider=os.getenv("BMJM_LLM_PROVIDER", "openai"),
            model=os.getenv("BMJM_LLM_MODEL", "gpt-4o-mini"),
            api_key=os.getenv("BMJM_LLM_API_KEY", ""),
            api_base=os.getenv("BMJM_LLM_API_BASE", ""),
        )

    def chat(self, messages: list[dict], system_prompt: str = "") -> str:
        """对话补全"""
        if not self.config.api_key:
            logger.warning("LLM API key not configured, using fallback")
            return self._fallback_reply(messages)

        try:
            full_messages = []
            if system_prompt:
                full_messages.append({"role": "system", "content": system_prompt})
            full_messages.extend(messages)

            return self._call_llm(full_messages)
        except Exception as e:
            logger.error("LLM call failed", error=str(e))
            return self._fallback_reply(messages)

    def _call_llm(self, messages: list[dict]) -> str:
        """实际调用 LLM"""
        config = self.config

        if config.provider == "openai":
            return self._call_openai(messages)
        elif config.provider == "azure":
            return self._call_azure(messages)
        elif config.provider == "ollama":
            return self._call_ollama(messages)
        else:
            return self._call_openai_compatible(messages)

    def _call_openai(self, messages: list[dict]) -> str:
        """调用 OpenAI 兼容接口"""
        from openai import OpenAI
        client = OpenAI(
            api_key=self.config.api_key,
            base_url=self.config.api_base or "https://api.openai.com/v1",
        )
        resp = client.chat.completions.create(
            model=self.config.model,
            messages=messages,
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature,
        )
        return resp.choices[0].message.content or ""

    def _call_azure(self, messages: list[dict]) -> str:
        """调用 Azure OpenAI"""
        from openai import AzureOpenAI
        client = AzureOpenAI(
            api_key=self.config.api_key,
            azure_endpoint=self.config.api_base,
            api_version="2024-02-15-preview",
        )
        resp = client.chat.completions.create(
            model=self.config.model,
            messages=messages,
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature,
        )
        return resp.choices[0].message.content or ""

    def _call_ollama(self, messages: list[dict]) -> str:
        """调用 Ollama（本地模型）"""
        import httpx
        payload = {
            "model": self.config.model,
            "messages": messages,
            "stream": False,
        }
        base = self.config.api_base or "http://localhost:11434"
        resp = httpx.post(f"{base}/api/chat", json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "")

    def _call_openai_compatible(self, messages: list[dict]) -> str:
        """调用 OpenAI 兼容接口（通用）"""
        import httpx
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.config.model,
            "messages": messages,
            "max_tokens": self.config.max_tokens,
            "temperature": self.config.temperature,
        }
        base = self.config.api_base or "https://api.openai.com/v1"
        resp = httpx.post(
            f"{base}/chat/completions",
            headers=headers,
            json=payload,
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

    def _fallback_reply(self, messages: list[dict]) -> str:
        """无 LLM 时的兜底回复"""
        last_msg = messages[-1]["content"] if messages else ""
        return f"已收到你的消息，但由于 LLM 服务未配置，暂时无法进行智能分析。请配置 BMJM_LLM_API_KEY 环境变量。收到的消息: {last_msg[:50]}..."

    # ---------------------------------------------------------------
    # 业务方法
    # ---------------------------------------------------------------

    def analyze_founder_input(self, user_input: str) -> dict:
        """分析创始人输入，提取结构化信息"""
        system = "你是一个创业分析助手。请从用户输入中提取结构化信息，仅返回 JSON，格式：{\"facts\":[{\"category\":\"customer_segment|pain_point|value_proposition|revenue_model|channel\",\"statement\":\"...\"}]}"
        messages = [{"role": "user", "content": user_input}]
        reply = self.chat(messages, system_prompt=system)
        try:
            return json.loads(reply)
        except json.JSONDecodeError:
            return {"facts": []}

    def generate_question(self, missing_categories: list[str], existing_facts: list[str]) -> str:
        """生成追问"""
        facts_str = "、".join(existing_facts) if existing_facts else "暂无"
        system = "你是一个创业教练。根据已收集的信息，生成一个自然的问题来补充缺失的信息。问题要具体、有引导性，不能太宽泛。"
        messages = [{"role": "user", "content": f"已收集: {facts_str}\n缺失分类: {', '.join(missing_categories)}\n请生成一个问题来了解{missing_categories[0]}方面的信息。"}]
        return self.chat(messages, system_prompt=system)

    def enrich_verification_action(self, suggestion: str, dimension: str) -> str:
        """根据建议生成更具体的验证动作"""
        system = "你是一个创业教练。为创始人生成一个可执行的验证动作。验证动作必须包含具体步骤、量化标准和判断条件。"
        messages = [{"role": "user", "content": f"建议: {suggestion}\n维度: {dimension}\n请生成一个具体的验证动作。"}]
        return self.chat(messages, system_prompt=system)


# 全局单例
_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """获取 LLM 客户端（单例）"""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client


def set_llm_config(config: LLMConfig):
    """由 MealKey 上层注入配置"""
    global _llm_client
    _llm_client = LLMClient(config)
    logger.info("LLM config updated", provider=config.provider, model=config.model)
