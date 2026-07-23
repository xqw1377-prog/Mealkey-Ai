import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function listModels(schemaPath: string): string[] {
  const raw = fs.readFileSync(schemaPath, "utf8");
  return [...raw.matchAll(/^model\s+(\w+)\s*\{/gm)].map((match) => match[1]).sort();
}

describe("prisma schema parity", () => {
  it("postgresql schema 与 sqlite 主 schema 的 model 集合一致", () => {
    const prismaDir = path.resolve(__dirname, "../prisma");
    const sqliteModels = listModels(path.join(prismaDir, "schema.prisma"));
    const pgModels = listModels(path.join(prismaDir, "schema.postgresql.prisma"));

    expect(pgModels).toEqual(sqliteModels);
    expect(pgModels.length).toBeGreaterThan(30);
  });

  it("postgresql schema 使用 postgresql provider", () => {
    const schema = fs.readFileSync(
      path.resolve(__dirname, "../prisma/schema.postgresql.prisma"),
      "utf8",
    );
    expect(schema).toMatch(/provider\s*=\s*"postgresql"/);
    expect(schema).not.toMatch(/provider\s*=\s*"sqlite"/);
  });
});
