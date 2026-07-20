import { describe, expect, it } from "vitest";
import {
  parseBingHtml,
  parseDuckDuckGoHtml,
} from "../../../packages/knowledge-engine/src/web-search";

describe("web search HTML parsers", () => {
  it("parses DuckDuckGo HTML results and unwraps uddg", () => {
    const html = `
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fa">长沙湘菜市场</a>
      <a class="result__snippet">长沙餐饮收入增长，湘菜竞争加剧。</a>
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fb">竞对格局</a>
      <a class="result__snippet">费大厨等品牌占据心智。</a>
    `;
    const rows = parseDuckDuckGoHtml(html, 5);
    expect(rows.length).toBe(2);
    expect(rows[0].url).toBe("https://example.com/a");
    expect(rows[0].snippet).toMatch(/餐饮收入/);
    expect(rows[0].source).toBe("duckduckgo");
  });

  it("parses Bing b_algo blocks", () => {
    const html = `
      <li class="b_algo">
        <h2><a href="https://news.example.com/x">区域市场分析</a></h2>
        <div class="b_caption"><p>长沙湘菜商圈供给密集。</p></div>
      </li>
    `;
    const rows = parseBingHtml(html, 3);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("区域市场分析");
    expect(rows[0].url).toBe("https://news.example.com/x");
    expect(rows[0].source).toBe("bing");
  });
});
