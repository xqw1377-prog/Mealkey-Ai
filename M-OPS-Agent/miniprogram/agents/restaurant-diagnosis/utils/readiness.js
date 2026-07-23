/** 就绪度仪表：硬门槛 / 强建议进度 */
const paste = require("./paste-import.js");

function buildReadinessGauge(bundle) {
  const qc = paste.assessImportBundle(bundle || {});
  const hardItems = [
    {
      id: "daily",
      label: "日×餐段 ≥7 营业日",
      done: qc.canDeepFinance,
      detail: qc.days + " 天 / " + qc.dailyRows + " 行",
    },
  ];
  const softItems = [
    {
      id: "sales",
      label: "菜品销售 ≥8 行",
      done: qc.salesRows >= 8,
      detail: qc.salesRows + " 行",
    },
    {
      id: "menu",
      label: "菜单主数据",
      done: qc.menuRows >= 1,
      detail: qc.menuRows + " 项",
    },
    {
      id: "comments",
      label: "评论证据",
      done: qc.evidenceRows >= 1,
      detail: qc.evidenceRows + " 条",
    },
  ];
  const hardDone = hardItems.filter(function (i) {
    return i.done;
  }).length;
  const softDone = softItems.filter(function (i) {
    return i.done;
  }).length;
  const hardPct = Math.round((hardDone / hardItems.length) * 100);
  const softPct = Math.round((softDone / softItems.length) * 100);
  const overallPct = Math.round((hardPct * 0.6 + softPct * 0.4));
  return {
    qc: qc,
    hardItems: hardItems,
    softItems: softItems,
    hardPct: hardPct,
    softPct: softPct,
    overallPct: overallPct,
    summary: qc.summary,
  };
}

module.exports = {
  buildReadinessGauge: buildReadinessGauge,
};
