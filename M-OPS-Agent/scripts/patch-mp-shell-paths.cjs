const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../miniprogram/agents/restaurant-diagnosis/pages");
const replacements = [
  ["/pages/index/index", "/agents/restaurant-diagnosis/pages/index/index"],
  ["/pages/intake/intake", "/agents/restaurant-diagnosis/pages/intake/intake"],
  ["/pages/import/import", "/agents/restaurant-diagnosis/pages/import/import"],
  ["/pages/report/report", "/agents/restaurant-diagnosis/pages/report/report"],
  ["/pages/learn/learn", "/agents/restaurant-diagnosis/pages/learn/learn"],
  ["/pages/archive/archive", "/agents/restaurant-diagnosis/pages/archive/archive"],
  ["/pages/action/action", "/agents/restaurant-diagnosis/pages/action/action"],
  ["/pages/enhance/enhance", "/agents/restaurant-diagnosis/pages/enhance/enhance"],
  [
    "require(\"../../utils/mealkey-cta.js\")",
    "require(\"../../../../shell/mealkey-cta.js\")",
  ],
];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      walk(p);
      continue;
    }
    if (!name.endsWith(".js")) continue;
    let text = fs.readFileSync(p, "utf8");
    const orig = text;
    for (const [from, to] of replacements) {
      text = text.split(from).join(to);
    }
    // 能力内「回首页」回到 Shell，而不是 Agent 首页
    text = text.split(
      'url: "/agents/restaurant-diagnosis/pages/index/index"',
    ).join('url: "/shell/pages/home/home"');
    if (text !== orig) {
      fs.writeFileSync(p, text);
      console.log("patched", path.relative(process.cwd(), p));
    }
  }
}

walk(root);

const utilsDir = path.join(
  __dirname,
  "../miniprogram/agents/restaurant-diagnosis/utils",
);
for (const f of ["diagnose.js", "synthetic.js", "category-packs.js"]) {
  const p = path.join(utilsDir, f);
  let text = fs.readFileSync(p, "utf8");
  const next = text.replace(
    /require\("\.\.\/libs\//g,
    'require("../../../libs/',
  );
  if (next !== text) {
    fs.writeFileSync(p, next);
    console.log("libs", f);
  }
}

console.log("done");
