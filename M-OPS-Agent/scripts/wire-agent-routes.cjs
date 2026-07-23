const fs = require("fs");
const path = require("path");

const pagesDir = path.join(
  __dirname,
  "../miniprogram/agents/restaurant-diagnosis/pages",
);

const replacements = [
  [
    'wx.navigateTo({ url: "/agents/restaurant-diagnosis/pages/intake/intake?mode=exam" })',
    'routes.go("intake", { mode: "exam" })',
  ],
  [
    'wx.navigateTo({ url: "/agents/restaurant-diagnosis/pages/intake/intake" })',
    'routes.go("intake")',
  ],
  [
    'wx.navigateTo({ url: "/agents/restaurant-diagnosis/pages/import/import" })',
    'routes.go("import")',
  ],
  [
    'wx.navigateTo({ url: "/agents/restaurant-diagnosis/pages/report/report" })',
    'routes.go("report")',
  ],
  [
    'wx.reLaunch({ url: "/agents/restaurant-diagnosis/pages/report/report" })',
    'routes.go("report")',
  ],
  [
    'wx.navigateTo({ url: "/agents/restaurant-diagnosis/pages/learn/learn" })',
    'routes.go("learn")',
  ],
  [
    'wx.navigateTo({ url: "/agents/restaurant-diagnosis/pages/archive/archive" })',
    'routes.go("archive")',
  ],
  [
    'wx.navigateTo({ url: "/agents/restaurant-diagnosis/pages/action/action" })',
    'routes.go("action")',
  ],
  [
    'wx.navigateTo({ url: "/agents/restaurant-diagnosis/pages/enhance/enhance" })',
    'routes.go("enhance")',
  ],
  [
    'wx.reLaunch({ url: "/shell/pages/home/home" })',
    "routes.goShellHome()",
  ],
];

function ensureRoutesRequire(text) {
  if (text.includes('require("../../routes.js")')) return text;
  if (text.includes("routes.go") || text.includes("routes.goShellHome")) {
    return 'const routes = require("../../routes.js");\n' + text;
  }
  return text;
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
      continue;
    }
    if (!name.endsWith(".js")) continue;
    // index already rewritten
    if (p.endsWith(`${path.sep}index${path.sep}index.js`)) continue;
    let text = fs.readFileSync(p, "utf8");
    const orig = text;
    for (const [from, to] of replacements) {
      text = text.split(from).join(to);
    }
    if (text !== orig) {
      text = ensureRoutesRequire(text);
      // remove duplicate mealkey-only shell reLaunch leftovers handled
      fs.writeFileSync(p, text);
      console.log("patched", path.relative(process.cwd(), p));
    }
  }
}

walk(pagesDir);
console.log("agent routes wired");
