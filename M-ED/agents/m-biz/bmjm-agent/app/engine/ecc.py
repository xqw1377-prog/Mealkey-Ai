"""认知链引擎 (ECC Controller) — 五层认知链的全生命周期管理"""

import uuid
import structlog
from datetime import datetime, timezone
from typing import Optional

from app.models.ecc_schemas import (
    ChainSession, ChainStatus, CognitionLayer, FactNode, FactCategory, FactSource,
    RuleJudgment, CrossAnalysis, StrategicSuggestion, VerificationTask, VerificationStatus,
    VerificationResult, ChatResponseData, CouncilReport,
)
from app.engine.fact_collector import FactCollector
from app.engine.singleton import get_engine
from app.engine.llm import get_llm_client
from app.engine.committee import CouncilChair
from app.models.schemas import (
    JudgeRequest, EnterpriseInfo, BusinessModelData, JudgeConfig,
    DimensionScore, OverallHealth,
)

logger = structlog.get_logger()


class ECCController:
    """认知链控制器 — 状态管理、层间路由、追问调度"""

    def __init__(self):
        self.inference_engine = get_engine()
        self.fact_collector = FactCollector()
        self.council_chair = CouncilChair()
        # 内存会话存储 (生产环境应换 Redis)
        self.sessions: dict[str, ChainSession] = {}
        logger.info("ECC controller initialized")

    # ---------------------------------------------------------------
    # 会话管理
    # ---------------------------------------------------------------

    def create_session(self, enterprise_name: str, industry: str = "", stage: str = "") -> ChainSession:
        """创建新认知链会话"""
        session_id = f"ecc_{uuid.uuid4().hex[:12]}"
        session = ChainSession(
            session_id=session_id,
            enterprise_name=enterprise_name,
            industry=industry,
            stage=stage if stage else "seed",
            status=ChainStatus.COLLECTING,
            current_layer=CognitionLayer.L1_FACT,
        )
        # 为初始问题添加专家身份标签
        raw_questions = self.fact_collector.get_initial_questions(industry)
        tagged_questions = []
        question_experts = [
            ("cpo", "产品官", "陈峰"),
            ("cfo", "财务官", "李敏"),
            ("cso", "战略官", "王远"),
        ]
        for i, q in enumerate(raw_questions):
            if i < len(question_experts):
                _, title, name = question_experts[i]
                tagged_questions.append(f"[{title} {name}] {q}")
            else:
                tagged_questions.append(q)
        session.pending_questions = tagged_questions
        self.sessions[session_id] = session
        logger.info("session created", session_id=session_id, enterprise=enterprise_name)
        return session

    def get_session(self, session_id: str) -> Optional[ChainSession]:
        """获取会话"""
        return self.sessions.get(session_id)

    # ---------------------------------------------------------------
    # 核心入口
    # ---------------------------------------------------------------

    def process_message(self, session_id: str, message: str) -> ChatResponseData:
        """处理用户消息 — 核心入口"""
        session = self.get_session(session_id)
        if not session:
            return ChatResponseData(
                session_id=session_id,
                status=ChainStatus.BLOCKED,
                current_layer=CognitionLayer.L1_FACT,
                reply="会话不存在或已过期，请重新开始。",
                progress=0.0,
            )

        # 记录已答追问
        if session.pending_questions:
            current_q = session.pending_questions.pop(0) if session.pending_questions else ""
            session.answered_questions.append({"question": current_q, "answer": message})

        # 根据当前认知层路由
        route = {
            CognitionLayer.L1_FACT: self._handle_l1,
            CognitionLayer.L2_RULE: self._handle_l2,
            CognitionLayer.L3_ANALYSIS: self._handle_l3,
            CognitionLayer.L4_STRATEGY: self._handle_l4,
            CognitionLayer.L5_VERIFICATION: self._handle_l5,
        }
        handler = route.get(session.current_layer)
        if handler:
            return handler(session, message) if session.current_layer == CognitionLayer.L1_FACT else handler(session)
        return self._build_response(session, "认知链状态异常，请重新开始。")

    # ---------------------------------------------------------------
    # L1: 事实认知
    # ---------------------------------------------------------------

    def _handle_l1(self, session: ChainSession, message: str) -> ChatResponseData:
        """L1 事实认知 — 信息收集 + 追问调度（带专家身份）"""
        new_nodes = self.fact_collector.extract_facts(message, session.industry)
        for node in new_nodes:
            if not any(n.statement == node.statement for n in session.fact_nodes):
                session.fact_nodes.append(node)

        if session.pending_questions:
            session.update_timestamp()
            question = session.pending_questions[0]
            # 如果追问带了专家前缀，保留它
            return self._build_response(session, f"好的，已记录。\n\n{question}", progress=0.15)

        missing = self.fact_collector.check_missing_categories(session.fact_nodes, stage=session.stage)
        if missing:
            new_questions = self.fact_collector.generate_follow_ups(missing, existing_facts=session.fact_nodes)
            # 为追问分配专家身份
            expert_tagged = self._assign_expert_to_questions(missing, new_questions)
            # 如有 LLM 配置，增强追问的自然度
            try:
                llm = get_llm_client()
                if llm.config.api_key:
                    existing = [n.statement for n in session.fact_nodes]
                    enhanced = llm.generate_question(missing, existing)
                    if enhanced and len(enhanced) > 5:
                        expert_tagged[0] = self._tag_question(missing[0], enhanced)
            except Exception:
                pass
            session.pending_questions.extend(expert_tagged)
            session.update_timestamp()
            return self._build_response(session, f"{expert_tagged[0]}", progress=0.2)

        session.completed_layers.append(CognitionLayer.L1_FACT)
        session.current_layer = CognitionLayer.L2_RULE
        session.update_timestamp()
        logger.info("L1 complete, entering L2", session_id=session.session_id)
        return self._handle_l2(session)

    def _assign_expert_to_questions(self, missing_categories: list[str], questions: list[str]) -> list[str]:
        """为追问分配专家身份标签"""
        # 分类 → 最合适的专家
        cat_to_expert = {
            "customer_segment": "cpo",
            "pain_point": "cpo",
            "value_proposition": "cpo",
            "revenue_model": "cfo",
            "channel": "coo",
            "key_metric": "cfo",
            "competitive_landscape": "cso",
            "team": "coo",
        }
        tagged = []
        for i, cat in enumerate(missing_categories):
            q = questions[i] if i < len(questions) else questions[-1] if questions else ""
            tagged.append(self._tag_question(cat, q))
        return tagged

    def _tag_question(self, category: str, question: str) -> str:
        """为单个问题添加专家身份前缀"""
        cat_to_expert = {
            "customer_segment": ("陈峰", "产品官"),
            "pain_point": ("陈峰", "产品官"),
            "value_proposition": ("陈峰", "产品官"),
            "revenue_model": ("李敏", "财务官"),
            "channel": ("张诚", "运营官"),
            "key_metric": ("李敏", "财务官"),
            "competitive_landscape": ("王远", "战略官"),
            "team": ("张诚", "运营官"),
        }
        expert_info = cat_to_expert.get(category)
        if expert_info:
            return f"[{expert_info[1]} {expert_info[0]}] {question}"
        return question

    # ---------------------------------------------------------------
    # L2: 规则认知
    # ---------------------------------------------------------------

    def _handle_l2(self, session: ChainSession) -> ChatResponseData:
        """L2 规则认知 — 规则匹配 + 构建可回溯证据链"""
        bm_data = self.fact_collector.facts_to_business_model(session.fact_nodes)
        industry = session.industry if session.industry else "saas"

        # 调用 InferenceEngine.judge_l2() — 仅此一个调用
        l2_result = self.inference_engine.judge_l2(bm_data.model_dump(), industry, session.stage)
        triggered_rules = l2_result["triggered_rules"]
        metrics = l2_result["metrics"]

        # 追溯引用的 L1 事实节点
        domain_to_fact_categories = {
            "VP": ["value_proposition", "pain_point"],
            "CS": ["customer_segment"],
            "CH": ["channel", "key_metric"],
            "CR": ["customer_relationships", "key_metric"],
            "RS": ["revenue_model", "key_metric"],
            "KR": ["team", "competitive_landscape"],
            "KA": ["value_proposition"],
            "KP": ["competitive_landscape", "team"],
            "COST": ["key_metric", "revenue_model"],
        }
        facts_by_category: dict[str, list[str]] = {}
        for node in session.fact_nodes:
            cat = node.category.value
            facts_by_category.setdefault(cat, []).append(node.node_id)

        for rule in triggered_rules:
            conclusion = rule.get("conclusion", {})
            related_categories = domain_to_fact_categories.get(rule.get("domain", ""), [])
            related_fact_ids: list[str] = []
            for cat in related_categories:
                related_fact_ids.extend(facts_by_category.get(cat, []))
            if not related_fact_ids and session.fact_nodes:
                related_fact_ids = [n.node_id for n in session.fact_nodes[-2:]]

            session.rule_judgments.append(RuleJudgment(
                rule_id=rule["id"],
                domain=rule.get("domain", ""),
                input_fact_ids=related_fact_ids[:5],
                conclusion=conclusion.get("summary", ""),
                confidence=conclusion.get("confidence", 0.7),
                severity=conclusion.get("type", "info"),
            ))

        session.completed_layers.append(CognitionLayer.L2_RULE)
        session.current_layer = CognitionLayer.L3_ANALYSIS
        session.update_timestamp()
        logger.info("L2 complete, entering L3", session_id=session.session_id, rules_triggered=len(triggered_rules))
        return self._handle_l3(session)

    # ---------------------------------------------------------------
    # L3: 分析认知
    # ---------------------------------------------------------------

    def _handle_l3(self, session: ChainSession) -> ChatResponseData:
        """L3 分析认知 — 九维评分 + 交叉分析"""
        bm_data = self.fact_collector.facts_to_business_model(session.fact_nodes)
        industry = session.industry if session.industry else "saas"

        # 先走 judge_l2 获取 metrics 和 triggered_rules
        l2_result = self.inference_engine.judge_l2(bm_data.model_dump(), industry, session.stage)
        metrics_l3 = l2_result["metrics"]
        # 调用 InferenceEngine.judge_l3()
        l3_result = self.inference_engine.judge_l3(
            bm_data.model_dump(), metrics_l3, stage=session.stage,
        )
        scores = l3_result["dimension_scores"]
        health = l3_result["overall_health"]

        session.dimension_scores = {k: {"score": v.score, "summary": v.summary} for k, v in scores.items()}
        session.overall_health = {"score": health.score, "level": health.level.value}

        # 统计 L2 风险/积极数量
        risk_count = sum(1 for j in session.rule_judgments if j.severity in ("risk_warning", "warning"))
        positive_count = sum(1 for j in session.rule_judgments if j.severity == "positive")

        # 交叉分析
        weakness_dim = min(scores.items(), key=lambda x: x[1].score) if scores else ("VP", None)
        ca = CrossAnalysis(
            consistency_check="passed",
            key_weakness=f"{weakness_dim[0]}({weakness_dim[1].score}分) 为最低维度",
            growth_lever=f"优化 {weakness_dim[0]} 可最大程度提升综合健康度",
        )
        low_dims = [(d, s.score) for d, s in scores.items() if s.score <= 2]
        if low_dims:
            ca.key_weakness = f"短板维度: {', '.join(f'{d}({s}分)' for d, s in low_dims)}"

        profile_id = l3_result.get("profile_id")
        if profile_id:
            profile = self.inference_engine.profiling_engine.get_profile(profile_id)
            if profile:
                ca.pattern_matches.append({"pattern": profile["name"], "confidence": l3_result.get("match_confidence", 0)})

        session.cross_analysis = ca
        session.completed_layers.append(CognitionLayer.L3_ANALYSIS)
        session.current_layer = CognitionLayer.L4_STRATEGY
        session.update_timestamp()

        # 构建 L3 回复：委员会报告 + 触发规则摘要
        try:
            council_report = self.council_chair.generate_report(
                dimension_scores=session.dimension_scores,
                overall_health=session.overall_health,
                rule_judgments=session.rule_judgments,
                cross_analysis=session.cross_analysis,
                suggestions=[],
                stage=session.stage,
            )
            report_text = self.council_chair.format_report_text(council_report, session.enterprise_name)

            # 追加触发规则摘要（按专家分组）
            rule_lines = ["\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
                          "📋 委员会诊断依据（触发的判断规则）", ""]
            from app.engine.committee import EXPERT_PROFILES as EXP_PROFILES
            expert_rules: dict[str, list] = {code: [] for code in EXP_PROFILES}
            for rj in session.rule_judgments:
                # 用规则id反向查expert
                exp = "cso"
                for ec, rules_list in self.council_chair.expert_rules.items():
                    for r in rules_list:
                        if r.get("id") == rj.rule_id:
                            exp = ec
                            break
                expert_rules[exp].append(rj)

            for code in ["cso", "cpo", "cfo", "coo"]:
                profile = EXP_PROFILES.get(code, {})
                rjs = expert_rules.get(code, [])
                if rjs:
                    risk_rules = [rj for rj in rjs if rj.severity in ("risk_warning", "warning", "inconsistency")]
                    if risk_rules:
                        emojis = profile.get("emojis", {})
                        emoji = emojis.get("concern", "⚠️")
                        rule_lines.append(f"{emoji} {profile.get('title','')} {profile.get('name','')} 识别的风险：")
                        for rj in risk_rules[:3]:
                            rule_lines.append(f"  • {rj.conclusion}")
                        rule_lines.append("")

            rule_lines.append("---")
            rule_lines.append("接下来，委员会将进入策略阶段，为你的商业模式给出具体建议。")

            reply = report_text + "\n" + "\n".join(rule_lines)
        except Exception as e:
            logger.warning("L3 report formatting failed", error=str(e))
            reply = "分析完成，准备进入策略阶段。"

        logger.info("L3 complete, entering L4", session_id=session.session_id)
        return self._build_response(session, reply, progress=0.6)

    # ---------------------------------------------------------------
    # L4: 策略认知
    # ---------------------------------------------------------------

    def _handle_l4(self, session: ChainSession) -> ChatResponseData:
        """L4 策略认知 — 生成建议 + 验证动作"""
        bm_data = self.fact_collector.facts_to_business_model(session.fact_nodes)
        industry = session.industry if session.industry else "saas"
        # 重新走 judge_l2 获取完整 metrics 和 triggered_rules
        l2_result = self.inference_engine.judge_l2(bm_data.model_dump(), industry, session.stage)
        metrics = l2_result["metrics"]
        triggered_rules = l2_result["triggered_rules"]

        # 重建评分对象
        dim_scores_obj = {
            k: DimensionScore(score=v["score"], summary=v["summary"])
            for k, v in session.dimension_scores.items()
        }
        health_obj = OverallHealth(
            score=session.overall_health["score"],
            level=session.overall_health["level"],
        )

        # 获取画像信息传给 judge_l4
        profile = None
        profile_id = None
        if hasattr(self.inference_engine, 'profiling_engine'):
            # 从 L3 阶段保存的画像数据获取
            if session.cross_analysis and session.cross_analysis.pattern_matches:
                first_match = session.cross_analysis.pattern_matches[0]
                pid = first_match.get("pattern", "")
                # 将画像名转为 profile_id
                known_profiles = {
                    "标准 SaaS 订阅模式": "PROF-SAAS-001",
                    "免费增值模式": "PROF-FREEMIUM-001",
                    "双边平台模式": "PROF-PLATFORM-001",
                    "硬件+服务模式": "PROF-HWPLUS-001",
                    "产品制造分销模式": "PROF-MFG-001",
                    "连锁加盟模式": "PROF-FRANCHISE-001",
                    "数据变现模式": "PROF-DATA-001",
                    "内容订阅模式": "PROF-CONTENT-001",
                }
                pid = known_profiles.get(pid, pid)
                profile = self.inference_engine.profiling_engine.get_profile(pid)

        suggestions = self.inference_engine.judge_l4(
            dim_scores_obj, health_obj, triggered_rules, metrics,
            profile, session.stage, require_verification=True,
        )

        # 如有 LLM 配置，增强验证动作的具体性
        try:
            llm = get_llm_client()
            if llm.config.api_key:
                for s in suggestions:
                    enriched = llm.enrich_verification_action(s.action, s.dimension)
                    if enriched and len(enriched) > 10:
                        s.verification_action = enriched
        except Exception:
            pass

        for i, s in enumerate(suggestions):
            session.suggestions.append(StrategicSuggestion(
                suggestion_id=f"SUGGEST-{i+1:03d}",
                priority=s.priority.value,
                dimension=s.dimension,
                action=s.action,
                expected_impact=s.expected_impact,
                verification_action=s.verification_action,
                estimated_verification_period=s.estimated_verification_period,
            ))

        from datetime import timedelta
        for s in session.suggestions:
            if s.verification_action:
                period_days = 30
                if "2 周" in s.estimated_verification_period:
                    period_days = 14
                elif "1 个月" in s.estimated_verification_period:
                    period_days = 30
                elif "3 个月" in s.estimated_verification_period:
                    period_days = 90
                session.verification_tasks.append(VerificationTask(
                    task_id=f"VERIFY-{uuid.uuid4().hex[:8]}",
                    source_suggestion_id=s.suggestion_id,
                    dimension=s.dimension,
                    verification_action=s.verification_action,
                    estimated_period=s.estimated_verification_period,
                    deadline=datetime.now(timezone.utc) + timedelta(days=period_days),
                ))

        session.completed_layers.append(CognitionLayer.L4_STRATEGY)
        session.current_layer = CognitionLayer.L5_VERIFICATION
        session.status = ChainStatus.AWAITING_VERIFICATION
        session.update_timestamp()

        # 构建 L4 回复：委员会报告 + 按专家分组的建议
        try:
            council_report = self.council_chair.generate_report(
                dimension_scores=session.dimension_scores,
                overall_health=session.overall_health,
                rule_judgments=session.rule_judgments,
                cross_analysis=session.cross_analysis,
                suggestions=session.suggestions,
                stage=session.stage,
            )
            report_lines = []

            # 委员会报告
            report_lines.append(self.council_chair.format_report_text(council_report, session.enterprise_name))

            # 按专家分组的建议
            report_lines.append("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            report_lines.append("📋 委员会策略建议")
            report_lines.append("")

            # 分组
            from app.engine.committee import EXPERT_PROFILES
            expert_suggestions: dict[str, list] = {
                code: [] for code in EXPERT_PROFILES
            }
            for s in session.suggestions:
                for code, profile in EXPERT_PROFILES.items():
                    if s.dimension in profile.get("concerned_dims", []):
                        expert_suggestions[code].append(s)
                        break

            for code in ["cso", "cpo", "cfo", "coo"]:
                profile = EXPERT_PROFILES.get(code, {})
                suggs = expert_suggestions.get(code, [])
                if suggs:
                    emojis = profile.get("emojis", {})
                    emoji = emojis.get("advice", "📋")
                    report_lines.append(f"{emoji} **{profile.get('title','')} {profile.get('name','')} 的建议：**")
                    for s in suggs[:3]:
                        priority_tag = "🔴" if s.priority in ("high", "HIGH") else "🟡" if s.priority in ("medium", "MEDIUM") else "🟢"
                        report_lines.append(f"  {priority_tag} **{s.action}**")
                        if s.expected_impact:
                            report_lines.append(f"    预期效果：{s.expected_impact}")
                        if s.verification_action:
                            report_lines.append(f"    ✅ 验证动作：{s.verification_action}")
                    report_lines.append("")

            # 过渡语
            report_lines.append("---")
            report_lines.append("以上建议均已附带可执行的验证动作（'不算死账'原则）。请逐条验证，验证结果可回注给委员会进行认知升级。")

            reply = "\n".join(report_lines)

        except Exception as e:
            logger.warning("L4 council report formatting failed", error=str(e))
            reply = f"分析完成，共生成 {len(session.suggestions)} 条策略建议。请查看详细报告。"

        logger.info("L4 complete, entering L5", session_id=session.session_id, suggestions=len(session.suggestions))
        return self._build_response(session, reply, progress=0.8)

    # ---------------------------------------------------------------
    # L5: 验证认知
    # ---------------------------------------------------------------

    def _handle_l5(self, session: ChainSession) -> ChatResponseData:
        """L5 验证认知 — 展示验证任务"""
        pending_tasks = [t for t in session.verification_tasks if t.status == VerificationStatus.UNVERIFIED]
        completed_count = len(session.verification_tasks) - len(pending_tasks)
        total_count = len(session.verification_tasks)

        if total_count == 0:
            reply = "已完成分析，暂无待验证的建议。"
            session.status = ChainStatus.COMPLETED
        else:
            pending_count = len(pending_tasks)

            # 先用委员会报告总结
            try:
                council_report = self.council_chair.generate_report(
                    dimension_scores=session.dimension_scores,
                    overall_health=session.overall_health,
                    rule_judgments=session.rule_judgments,
                    cross_analysis=session.cross_analysis,
                    suggestions=session.suggestions,
                    stage=session.stage,
                )
                report_text = self.council_chair.format_report_text(council_report, session.enterprise_name)
            except Exception:
                report_text = ""

            # 验证任务
            tasks_text = f"\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            tasks_text += f"📋 验证任务清单（共 {total_count} 条）\n\n"
            for i, task in enumerate(pending_tasks[:5], 1):
                tasks_text += f"{i}. {task.verification_action}\n"
            if len(pending_tasks) > 5:
                tasks_text += f"\n...还有 {len(pending_tasks)-5} 条待验证任务\n"

            tasks_text += (
                "\n请逐条验证，完成后回到此对话提交验证结果。"
                "\n每条验证结果回注后，委员会将重新评估并更新建议。"
            )

            reply = report_text + tasks_text if report_text else tasks_text

        progress = 0.8 + 0.2 * (completed_count / max(total_count, 1))
        session.update_timestamp()
        return self._build_response(session, reply, progress=min(progress, 1.0))

    # ---------------------------------------------------------------
    # 回注与认知升级
    # ---------------------------------------------------------------

    def submit_verification(self, session_id: str, task_id: str, result: VerificationResult) -> ChatResponseData:
        """处理验证结果回注 — 认知升级 + 触发增量推理"""
        session = self.get_session(session_id)
        if not session:
            return ChatResponseData(
                session_id=session_id, status=ChainStatus.BLOCKED,
                current_layer=CognitionLayer.L5_VERIFICATION,
                reply="会话不存在。", progress=0.0,
            )

        for task in session.verification_tasks:
            if task.task_id == task_id:
                task.status = result.result
                break

        session.verification_results.append(result)

        # 2. 认知升级：按回注结果差异化处理
        if result.new_insights:
            for insight in result.new_insights:
                session.fact_nodes.append(FactNode(
                    node_id=f"FACT-INSIGHT-{uuid.uuid4().hex[:8]}",
                    category=FactCategory.OTHER,
                    statement=insight,
                    confidence=0.6, source=FactSource.INFERRED,
                    needs_verification=False,
                    verification_status=VerificationStatus.PASS,
                ))
            logger.info("cognitive upgrade from verification", session_id=session_id, insights=len(result.new_insights))

        if result.result == VerificationStatus.PASS:
            logger.info("verification passed, marking suggestion as validated", task_id=task_id)
        elif result.result == VerificationStatus.PARTIAL_PASS:
            # 部分通过：在已有事实基础上添加补充验证任务
            if result.conclusion:
                session.fact_nodes.append(FactNode(
                    node_id=f"FACT-FB-{uuid.uuid4().hex[:8]}",
                    category=FactCategory.OTHER,
                    statement=f"验证反馈: {result.conclusion}",
                    confidence=0.7, source=FactSource.INFERRED,
                    needs_verification=False,
                    verification_status=VerificationStatus.PARTIAL_PASS,
                ))
            logger.info("partial pass, added supplementary insight", task_id=task_id)

        # 3. 增量推理：清空 L2-L4，从 L2 重跑
        session.rule_judgments.clear()
        session.dimension_scores = {}
        session.overall_health = None
        session.cross_analysis = None
        session.suggestions.clear()
        session.current_layer = CognitionLayer.L2_RULE
        resp = self._handle_l2(session)
        session.update_timestamp()
        logger.info("cognitive chain re-triggered after verification", session_id=session_id)
        return resp

    # ---------------------------------------------------------------
    # 响应构建
    # ---------------------------------------------------------------

    def _build_response(self, session: ChainSession, reply: str, progress: float = 0.0) -> ChatResponseData:
        """构建对话响应"""
        if progress == 0.0:
            layer_progress = {
                CognitionLayer.L1_FACT: 0.2, CognitionLayer.L2_RULE: 0.4,
                CognitionLayer.L3_ANALYSIS: 0.6, CognitionLayer.L4_STRATEGY: 0.8,
                CognitionLayer.L5_VERIFICATION: 0.9,
            }
            progress = layer_progress.get(session.current_layer, 0.5)

        # 构建委员会报告（仅当 L3 层且尚未通过 L3/L4 handler 生成时）
        council_report = None
        enriched_reply = reply
        if session.current_layer in (
            CognitionLayer.L3_ANALYSIS, CognitionLayer.L4_STRATEGY,
            CognitionLayer.L5_VERIFICATION,
        ) and session.dimension_scores:
            try:
                council_report = self.council_chair.generate_report(
                    dimension_scores=session.dimension_scores,
                    overall_health=session.overall_health,
                    rule_judgments=session.rule_judgments,
                    cross_analysis=session.cross_analysis,
                    suggestions=session.suggestions,
                    stage=session.stage,
                )
                # L3 层的回复已经由 _handle_l3 生成了委员会文本，此处不重复替换
                # 但对于通过 quick_scan 直接跳到 L3 的请求，_handle_l3 也会生成文本
                # 所以不需要再做替换
            except Exception as e:
                logger.warning("council report generation failed", error=str(e))

        return ChatResponseData(
            session_id=session.session_id, status=session.status,
            current_layer=session.current_layer, reply=enriched_reply,
            pending_questions=session.pending_questions,
            fact_nodes=session.fact_nodes,
            dimension_scores=session.dimension_scores,
            rule_judgments=session.rule_judgments,
            suggestions=session.suggestions,
            verification_tasks=session.verification_tasks,
            progress=round(progress, 2),
            council_report=council_report,
        )
