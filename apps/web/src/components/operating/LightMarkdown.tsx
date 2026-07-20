/** 轻量 Markdown：标题/粗体/列表，避免流式内容把 ## ** 原样露出 */
export function LightMarkdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  return (
    <div className={className ?? "space-y-2 text-[15px] leading-7 text-[#202124]"}>
      {lines.map((line, index) => {
        const key = `${index}-${line.slice(0, 24)}`;
        const heading = line.match(/^(#{1,3})\s+(.*)$/);
        if (heading) {
          const level = heading[1].length;
          const content = renderInline(heading[2]);
          if (level === 1) {
            return (
              <p key={key} className="text-[18px] font-semibold leading-7 tracking-[-0.02em]">
                {content}
              </p>
            );
          }
          if (level === 2) {
            return (
              <p key={key} className="text-[16px] font-semibold leading-7">
                {content}
              </p>
            );
          }
          return (
            <p key={key} className="text-[15px] font-medium leading-7">
              {content}
            </p>
          );
        }

        const bullet = line.match(/^[-*•]\s+(.*)$/);
        if (bullet) {
          return (
            <p key={key} className="pl-1">
              <span className="mr-2 text-[#66735E]">•</span>
              {renderInline(bullet[1])}
            </p>
          );
        }

        if (!line.trim()) {
          return <div key={key} className="h-1" />;
        }

        return <p key={key}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(input: string) {
  const parts = input.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-[#181817]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}
