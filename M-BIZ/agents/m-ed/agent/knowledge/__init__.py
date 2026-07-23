"""M-ED 知识资产模块

职责：将 handler fallback 中的规则逻辑抽取为独立的知识资产，
      使规则可维护、可测试、可审计。

使用方式：
    from agent.knowledge.rules.equity_design import design_equity_fallback
    from agent.knowledge.rules.equity_adjust import adjust_equity_fallback
    from agent.knowledge.rules.simulate import simulate_fallback
    from agent.knowledge.rules.compliance import compliance_fallback
    from agent.knowledge.rules.document import document_fallback
"""
