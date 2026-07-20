/**
 * SSE / NDJSON 行缓冲读取：跨 chunk 拼完整行，避免 JSON 截断。
 */
export async function readSseJsonLines(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onLine: (jsonText: string) => void | Promise<void>,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  const throwIfAborted = () => {
    if (opts?.signal?.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }
  };

  while (true) {
    throwIfAborted();
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx = buffer.indexOf("\n");
    while (newlineIdx >= 0) {
      const rawLine = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      const line = rawLine.replace(/\r$/, "");
      if (line.startsWith("data: ")) {
        const payload = line.slice(6).trim();
        if (payload && payload !== "[DONE]") {
          await onLine(payload);
        }
      } else if (line.trim().startsWith("{")) {
        // 兼容非 SSE 前缀的纯 JSON 行
        await onLine(line.trim());
      }
      newlineIdx = buffer.indexOf("\n");
    }
  }

  const tail = buffer.trim();
  if (tail.startsWith("data: ")) {
    const payload = tail.slice(6).trim();
    if (payload && payload !== "[DONE]") await onLine(payload);
  } else if (tail.startsWith("{")) {
    await onLine(tail);
  }
}
