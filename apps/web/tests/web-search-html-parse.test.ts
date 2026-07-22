import { describe, expect, it } from "vitest";
import {
  filterChineseFacingSearchHits,
  isChineseFacingSearchHit,
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

describe("Chinese-facing search hit gate", () => {
  it("keeps Chinese catering snippets", () => {
    expect(
      isChineseFacingSearchHit({
        title: "开福区湘菜门店密度",
        snippet: "万国城商圈湘菜供给偏饱和，客单价与心智争夺加剧。",
        url: "https://news.example.cn/a",
      }),
    ).toBe(true);
  });

  it("drops English-dominant and blocked hosts", () => {
    expect(
      isChineseFacingSearchHit({
        title: "Contact Us - Microsoft Support",
        snippet:
          "Contact Microsoft Support. Find solutions to common problems with Hotmail and Outlook.",
        url: "https://support.microsoft.com/en-us",
      }),
    ).toBe(false);
    expect(
      isChineseFacingSearchHit({
        title: "Managing Condition Records for Sales Prices - SAP Learning",
        snippet:
          "Learn how to copy condition records in SAP S/4HANA for sales pricing workflows.",
        url: "https://learning.sap.com/learning-journey/x",
      }),
    ).toBe(false);
  });

  it("filters mixed lists down to Chinese hits only", () => {
    const kept = filterChineseFacingSearchHits(
      [
        {
          title: "Contact Microsoft Support",
          snippet: "Find solutions to common Hotmail problems online today.",
          url: "https://support.microsoft.com/en-us",
        },
        {
          title: "长沙开福区餐饮商圈观察",
          snippet: "万国城周边湘菜门店密集，竞争进入成熟期。",
          url: "https://local.example.cn/kaifu",
        },
      ],
      5,
    );
    expect(kept).toHaveLength(1);
    expect(kept[0].title).toMatch(/开福区/);
  });
});
