"""验证动作生成引擎 - "不算死账"原则的合规检查"""

import re
import structlog
from datetime import datetime

logger = structlog.get_logger()


# 验证动作模板库
VERIFICATION_TEMPLATES = {
    "获客渠道优化": "请试运行 {channel} {months} 个月，统计 CAC 与转化率，对比当前渠道效率后再决定是否加大投入",
    "收入模式调整": "请对 top {n} 客户做付费意愿调研，统计接受率，若 > {threshold}% 再推进产品开发",
    "产品功能扩展": "请先对 {n} 名种子用户做内测，NPS > {threshold} 再正式上线",
    "客户留存优化": "请提取过去 {months} 个月流失用户的共性特征（登录频率/工单数/NPS评分），构建简易评分卡，回测准确率达到 70% 以上再实施",
    "团队补缺": "请先明确 {position} 的 {n} 个核心交付物与考核标准，再启动招聘流程",
    "融资准备": "请先准备 {n} 项关键材料（财务预测 + 数据看板 + 客户案例）再启动融资",
    "市场拓展": "请先收集目标市场的 {n} 项关键数据（竞争格局/监管要求/市场规模），再决定是否进入",
    "定价调整": "请对 top {n} 客户做价格敏感度测试，若接受率 > {threshold}% 再调整定价",
    "合作伙伴引入": "请先联系 {n} 家潜在合作伙伴做 PoC 验证，确认集成可行性与 ROI 后再签约",
    "数据驱动决策": "请先收集过去 {months} 个月的相关数据，建立基准线后再制定目标",
    "Mvp验证": "请先完成 MVP 开发并邀请 {n} 名种子用户内测，核心功能使用率达到 {threshold}% 再考虑正式上线",
    "第二曲线": "请先完成市场调研报告，识别 {n} 个潜在新业务方向，评估市场规模和进入难度后再决定投入方向",
    "转型方向验证": "请先完成 {n} 个潜在方向的 3C 分析（客户/竞争/自身），评分选出最优方向后再启动转型",
    "生态建设": "请先列出 {n} 个潜在合作伙伴，评估集成可行性和商业价值后再启动合作",
    "客户调研": "请先对 {n} 名目标客户做深度访谈，确认需求真实性和付费意愿后再投入开发",
    "产品定价验证": "请先做 A/B 定价测试，对比不同价格方案的转化率，选择最优方案后再全量上线",
    "留存优化": "请先分析过去 {months} 个月的客户行为数据，识别关键流失节点并制定干预方案",
    "品牌建设": "请先完成品牌定位和视觉识别系统设计，在小范围内测试用户认知度后再全面推广",
    "供应链优化": "请先评估当前供应链的效率和成本，对比 2-3 家替代供应商后再决定是否切换",
    "技术选型验证": "请先完成技术 PoC（概念验证），评估性能/成本/可维护性后再确定技术方案",
}

# 验证动作与建议类型的映射
VERIFICATION_MAPPING = {
    "渠道": "获客渠道优化",
    "获客": "获客渠道优化",
    "营销": "获客渠道优化",
    "收入": "收入模式调整",
    "付费": "收入模式调整",
    "定价": "定价调整",
    "产品": "产品功能扩展",
    "功能": "产品功能扩展",
    "留存": "客户留存优化",
    "流失": "客户留存优化",
    "客户关系": "客户留存优化",
    "团队": "团队补缺",
    "招聘": "团队补缺",
    "融资": "融资准备",
    "市场": "市场拓展",
    "海外": "市场拓展",
    "合作": "合作伙伴引入",
    "伙伴": "合作伙伴引入",
    "数据": "数据驱动决策",
    "MVP": "Mvp验证",
    "内测": "Mvp验证",
    "第二曲线": "第二曲线",
    "转型": "转型方向验证",
    "生态": "生态建设",
    "调研": "客户调研",
    "定价测试": "产品定价验证",
    "品牌": "品牌建设",
    "供应链": "供应链优化",
    "技术选型": "技术选型验证",
    "PoC": "技术选型验证",
}


class VerificationEngine:
    """验证动作生成与合规检查"""

    def __init__(self):
        pass

    def generate_verification_action(self, suggestion_text: str, dimension: str) -> str:
        """根据建议内容生成验证动作"""
        # 尝试匹配建议类型
        template_key = self._match_template(suggestion_text, dimension)
        if template_key and template_key in VERIFICATION_TEMPLATES:
            template = VERIFICATION_TEMPLATES[template_key]
            params = self._extract_params(suggestion_text, template_key)
            try:
                return template.format(**params)
            except KeyError:
                pass

        # 兜底模板
        return f"请先收集与「{suggestion_text}」相关的 {self._suggest_count(suggestion_text)} 项关键数据（当前现状、行业基准、成功案例），再制定具体执行方案"

    def _match_template(self, text: str, dimension: str) -> str | None:
        """匹配最合适的验证动作模板"""
        text_lower = text.lower()

        for keyword, template_name in VERIFICATION_MAPPING.items():
            if keyword in text_lower or keyword in dimension.lower():
                return template_name

        # 按维度兜底
        dimension_mapping = {
            "CH": "获客渠道优化",
            "RS": "收入模式调整",
            "VP": "产品功能扩展",
            "CR": "客户留存优化",
            "KR": "市场拓展",
            "KP": "合作伙伴引入",
        }
        return dimension_mapping.get(dimension)

    def _extract_params(self, text: str, template_key: str) -> dict:
        """从建议文本中提取模板参数"""
        params = {
            "channel": "目标渠道",
            "months": 3,
            "n": 10,
            "threshold": 30,
            "position": "关键岗位",
        }

        # 尝试提取数字
        numbers = re.findall(r'\d+', text)
        if numbers:
            params["n"] = int(numbers[0])
            if len(numbers) > 1:
                params["months"] = int(numbers[1])

        # 尝试提取渠道名
        channel_patterns = [
            "内容营销", "小红书", "抖音", "微信", "搜索引擎", "社交媒体",
            "线下活动", "渠道合作", "直营", "分销",
        ]
        for ch in channel_patterns:
            if ch in text:
                params["channel"] = ch
                break

        return params

    def _suggest_count(self, text: str) -> int:
        """根据建议长度推荐数据项数量"""
        length = len(text)
        if length > 50:
            return 5
        elif length > 20:
            return 3
        return 2

    def compliance_check(self, suggestions: list[dict]) -> list[dict]:
        """「不算死账」合规检查"""
        passed = []
        blocked = []

        for suggestion in suggestions:
            verification_action = suggestion.get("verification_action", "")
            issues = []

            # 检查存在性
            if not verification_action:
                issues.append("verification_action 不存在")

            # 检查非空性
            if verification_action and verification_action.strip() == "":
                issues.append("verification_action 为空字符串")

            # 检查可执行性 (包含具体步骤和判断标准)
            if verification_action and not self._is_actionable(verification_action):
                issues.append("验证动作缺少可量化的步骤或判断标准")

            # 检查结论可证伪
            if verification_action and not self._is_falsifiable(verification_action):
                issues.append("验证结果无法明确判定可行/不可行")

            if not issues:
                passed.append(suggestion)
            else:
                suggestion["_compliance_issues"] = issues
                blocked.append(suggestion)
                logger.warning(
                    "compliance check failed",
                    suggestion_id=suggestion.get("action", ""),
                    issues=issues,
                )

        return passed

    def _is_actionable(self, text: str) -> bool:
        """检查验证动作是否可执行（包含可量化步骤）"""
        # 检查是否包含具体动作词
        action_words = ["收集", "统计", "调研", "测试", "分析", "对比", "提取", "试运行", "联系"]
        has_action = any(word in text for word in action_words)

        # 检查是否包含量化指标
        has_metric = bool(re.search(r'\d+', text))

        return has_action and has_metric

    def _is_falsifiable(self, text: str) -> bool:
        """检查验证结果是否可证伪"""
        # 检查是否有明确的判断标准
        judgment_words = ["确认", "判断", "决定", "对比", "评估", "决定", "再推进", "再决定"]
        return any(word in text for word in judgment_words)

    def estimate_verification_period(self, suggestion_text: str) -> str:
        """估算验证周期"""
        if "调研" in suggestion_text or "问卷" in suggestion_text:
            return "2 周"
        elif "试运行" in suggestion_text or "测试" in suggestion_text:
            return "1 个月"
        elif "提取过去" in suggestion_text:
            return "1 个月"
        elif "联系" in suggestion_text:
            return "2 周"
        elif "收集" in suggestion_text:
            return "2 周"
        else:
            return "1 个月"
