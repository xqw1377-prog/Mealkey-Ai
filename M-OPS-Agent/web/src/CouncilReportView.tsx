import type { ConsultationReport, ReportModule } from "@mealkey/m-ops-diag";
import { useState } from "react";

function ModuleBlock(props: {
  module: ReportModule;
  levelStars: (level?: string) => string;
}) {
  const m = props.module;
  return (
    <section className="report-module" data-level={m.level || "observe"}>
      <div className="report-module-head">
        <div>
          <p className="eyebrow">模块 {m.no}</p>
          <h3>{m.title}</h3>
        </div>
        {m.level ? <span>{props.levelStars(m.level)}</span> : null}
      </div>
      <p className="report-module-summary">{m.summary}</p>
      {m.tables?.map((table, idx) => (
        <div key={idx} className="import-table-wrap" style={{ marginTop: 10 }}>
          <table className="import-table council-scorecard">
            <thead>
              <tr>
                {table.headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <ul className="report-module-bullets">
        {m.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </section>
  );
}

export function CouncilReportView(props: {
  report: ConsultationReport;
  levelStars: (level?: string) => string;
}) {
  const report = props.report;
  const [showDiscussion, setShowDiscussion] = useState(false);

  const bodyModules = (report.modules || []).filter((m) => m.id !== "discussion");
  const discussion = (report.modules || []).find((m) => m.id === "discussion");

  const fallback: ReportModule[] = [
    {
      id: "cover",
      no: "01",
      title: "报告封面",
      summary: report.overallVerdict,
      bullets: report.executiveSummary,
    },
  ];

  const modules = bodyModules.length ? bodyModules : fallback;

  return (
    <div className="mops-panel mops-doc mops-rise council-report">
      <p className="eyebrow">体检结果表 · 06</p>
      <h2 className="mops-serif-title">{report.title}</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        {report.subtitle}
      </p>

      <div className="council-cover">
        <div>
          <p className="eyebrow">受检门店</p>
          <strong>{report.restaurantName}</strong>
        </div>
        <div>
          <p className="eyebrow">综合判定</p>
          <strong data-level={report.overallLevel}>
            {report.overallVerdict} · {props.levelStars(report.overallLevel)}
          </strong>
        </div>
        <div>
          <p className="eyebrow">数据就绪</p>
          <strong>{report.dataReadinessScore ?? "—"}%</strong>
        </div>
      </div>

      {report.bossBrief ? (
        <aside className="council-boss-brief" aria-label="一句话主因">
          <p className="eyebrow">一句话主因（规则模板）</p>
          <p className="council-boss-brief-body">{report.bossBrief}</p>
        </aside>
      ) : null}

      <div className="section-heading" style={{ marginTop: 22 }}>
        <p className="eyebrow">执行摘要</p>
      </div>
      <ul className="council-summary">
        {report.executiveSummary.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="council-consensus">{report.consensus}</p>

      <div className="section-heading" style={{ marginTop: 22 }}>
        <p className="eyebrow">报告正文</p>
        <h2 className="mops-serif-title" style={{ fontSize: "1.15rem" }}>
          汇总结论，不按专家拆分成四份报告
        </h2>
      </div>

      <div className="report-module-stack">
        {modules.map((module) => (
          <ModuleBlock
            key={module.id}
            module={module}
            levelStars={props.levelStars}
          />
        ))}
      </div>

      <div className="section-heading" style={{ marginTop: 22 }}>
        <p className="eyebrow">会审讨论</p>
        <h2 className="mops-serif-title" style={{ fontSize: "1.15rem" }}>
          各方可以有不同观点，最终以汇总结论为准
        </h2>
      </div>

      <button
        type="button"
        className="btn btn-ghost"
        style={{ marginTop: 8 }}
        onClick={() => setShowDiscussion((v) => !v)}
      >
        {showDiscussion ? "收起讨论记录" : "展开四官讨论观点"}
      </button>

      {showDiscussion ? (
        <>
          {discussion ? (
            <div style={{ marginTop: 12 }}>
              <ModuleBlock module={discussion} levelStars={props.levelStars} />
            </div>
          ) : null}
          <div className="council-grid" style={{ marginTop: 12 }}>
            {report.experts.map((expert) => (
              <article
                key={expert.role}
                className="council-seat"
                data-level={expert.level}
              >
                <header>
                  <div>
                    <p className="eyebrow">{expert.seat} · 讨论发言</p>
                    <strong>{expert.title}</strong>
                  </div>
                  <span>{props.levelStars(expert.level)}</span>
                </header>
                {expert.refused ? (
                  <p className="council-refuse">拒签：{expert.refuseReason}</p>
                ) : null}
                <p className="council-verdict">{expert.verdict}</p>
                <div className="council-block">
                  <p className="eyebrow">观点要点</p>
                  <ul>
                    {(expert.analyses?.length
                      ? expert.analyses.slice(0, 3).map((a) => `${a.label}：${a.value}`)
                      : expert.observations.slice(0, 3)
                    ).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="council-block">
                  <p className="eyebrow">关切</p>
                  <ul>
                    {expert.risks.slice(0, 2).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="muted" style={{ marginTop: 10 }}>
          讨论记录默认折叠。需要追溯各方立场时再展开。
        </p>
      )}

      <p className="council-disclaimer">{report.disclaimer}</p>
    </div>
  );
}
