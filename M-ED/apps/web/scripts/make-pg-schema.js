const fs = require("fs");
let s = fs.readFileSync("prisma/schema.prisma", "utf8");
if (!s.includes('provider = "sqlite"')) {
  console.error("sqlite provider not found");
  process.exit(1);
}
s = s.replace('provider = "sqlite"', 'provider = "postgresql"');
fs.writeFileSync("prisma/schema.postgresql.prisma", s, "utf8");
console.log("wrote schema.postgresql.prisma");
console.log(s.match(/datasource db \{[\s\S]*?\n\}/)[0]);
