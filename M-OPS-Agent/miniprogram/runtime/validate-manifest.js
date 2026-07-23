/**
 * Runtime · Plugin Manifest 校验（上架前硬闸）
 */
function validateManifest(m) {
  const errors = [];
  const warnings = [];
  if (!m || typeof m !== "object") {
    return { ok: false, errors: ["manifest 为空"], warnings: [] };
  }
  if (!m.agentId || typeof m.agentId !== "string") {
    errors.push("缺少 agentId");
  }
  if (!m.displayName) errors.push("缺少 displayName");
  if (!m.family) warnings.push("建议填写 family（m-ops / m-pnt / …）");
  if (m.sharesBrain !== true) {
    errors.push("Plugin 必须 sharesBrain: true");
  }
  if (m.allowsStandaloneMp === true) {
    warnings.push("allowsStandaloneMp=true 仅模式2；官方挂载应为 false");
  }
  if (!m.miniUi || !m.miniUi.entryRoute) {
    errors.push("缺少 miniUi.entryRoute");
  }
  if (!m.billing || typeof m.billing.blockFirstValue === "undefined") {
    errors.push("缺少 billing.blockFirstValue");
  } else if (m.billing.blockFirstValue === true) {
    errors.push("billing.blockFirstValue 必须为 false（不得挡首价值）");
  }
  if (!m.billing.skus || !m.billing.skus.length) {
    warnings.push("未配置 billing.skus");
  }
  if (m.status === "live" && m.miniUi && !/^\/agents\//.test(m.miniUi.entryRoute)) {
    warnings.push("live Agent 的 entryRoute 建议在 /agents/<id>/ 下");
  }
  return { ok: errors.length === 0, errors: errors, warnings: warnings };
}

function assertManifest(m) {
  const r = validateManifest(m);
  if (!r.ok) {
    const msg = (m && m.agentId ? m.agentId + ": " : "") + r.errors.join("; ");
    console.error("[shell] invalid manifest", msg);
    throw new Error(msg);
  }
  if (r.warnings.length) {
    console.warn("[shell] manifest warnings", m.agentId, r.warnings);
  }
  return r;
}

module.exports = {
  validateManifest: validateManifest,
  assertManifest: assertManifest,
};
