import { describe, expect, it } from "vitest";
import { readSseJsonLines } from "../src/lib/sse-line-reader";
import { memoryRateLimitSize, rateLimit } from "../src/lib/rate-limit";

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i]));
      i += 1;
    },
  });
}

describe("SSE 行缓冲", () => {
  it("跨 chunk 拼完整 JSON 行", async () => {
    const lines: string[] = [];
    const stream = streamFromChunks([
      'data: {"type":"te',
      'xt","content":"你好"}\n',
      'data: {"type":"done"}\n',
    ]);
    await readSseJsonLines(stream.getReader(), (line) => {
      lines.push(line);
    });
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).content).toBe("你好");
  });
});

describe("rate limit prune", () => {
  it("可写入并返回 remaining", async () => {
    const before = memoryRateLimitSize();
    const r = await rateLimit(`test:prune:${Date.now()}`, 3, 1000);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(2);
    expect(memoryRateLimitSize()).toBeGreaterThanOrEqual(before);
  });
});
