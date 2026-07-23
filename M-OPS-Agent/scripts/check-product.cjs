const fs = require("fs");
const s = fs.readFileSync("packages/m-ops-diag/src/engines/expert-capabilities.ts", "utf8");
const i = s.indexOf("runProductOfficer");
console.log("--- product officer excerpt ---");
console.log(s.slice(i, i + 1800));
console.log("\nhas enrich call", s.includes("enrichDishSalesWithMenu(salesRaw"));
console.log("has menu refuse", s.includes("菜单硬门槛缺失"));
console.log("has menu_cost_join", s.includes("menu_cost_join"));
