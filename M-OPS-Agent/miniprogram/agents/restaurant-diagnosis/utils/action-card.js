/** 本周动作卡文案 */
function buildActionCard(profile, result) {
  const c = (result && result.consultation) || {};
  const priorities = c.priorities || [];
  const weekAction =
    priorities.find(function (p) {
      return !/^验证\/处置/.test(p);
    }) ||
    priorities[0] ||
    "本周先补齐日×餐段账本，再复检";
  const hyps = ((result && result.learningDraft) || []).slice(0, 2);
  const validations = [];
  for (let i = 0; i < hyps.length; i++) {
    const h = hyps[i];
    if (h.expectedOutcome) validations.push(h.expectedOutcome);
    else if (h.hypothesis) validations.push("验证：" + h.hypothesis);
  }
  if (!validations.length) {
    validations.push("周末高峰实地看一次等位与出菜时长");
  }
  const name = c.restaurantName || (profile && profile.name) || "本店";
  const brief = c.bossBrief || c.consensus || "";
  const lines = [
    "【餐启·本周经营动作卡】",
    name,
    "",
    "一句话主因：",
    brief,
    "",
    "本周只做这一件：",
    weekAction.replace(/（盯 #[^）]+）/g, ""),
    "",
    "怎么验证有没有做对：",
  ];
  for (let j = 0; j < validations.length; j++) {
    lines.push(j + 1 + ". " + validations[j]);
  }
  lines.push("");
  lines.push("（规则体检 · 全免 · 非大模型生成）");
  return {
    restaurantName: name,
    bossBrief: brief,
    weekAction: weekAction.replace(/（盯 #[^）]+）/g, ""),
    validations: validations,
    shareText: lines.join("\n"),
  };
}

module.exports = {
  buildActionCard: buildActionCard,
};
