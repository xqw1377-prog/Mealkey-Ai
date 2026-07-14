import { MKCard } from "./MKCard";

type MKConfidenceMetric = {
  label: string;
  value: number;
};

type MKConfidenceProps = {
  score: number;
  confidence: number;
  status: string;
  evidenceRules: number;
  evidenceCases: number;
  metrics?: MKConfidenceMetric[];
  description?: string;
};

function ProgressBar({ label, value }: MKConfidenceMetric) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">{label}</span>
        <span className="text-[13px] font-semibold leading-5 text-[#181817]">{value}</span>
      </div>
      <span className="block h-1.5 overflow-hidden rounded-full bg-[rgba(102,115,94,0.10)]">
        <span className="block h-full rounded-full bg-[#66735E]" style={{ width: `${value}%` }} />
      </span>
    </div>
  );
}

export function MKConfidence({
  score,
  confidence,
  status,
  evidenceRules,
  evidenceCases,
  metrics = [],
  description = "这不是项目打分，而是 AI 对当前项目状态的判断信心。",
}: MKConfidenceProps) {
  return (
    <MKCard
      className="rounded-[26px] border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] shadow-[0_16px_34px_rgba(24,24,23,0.04)]"
      eyebrow="Project Confidence"
      title="项目状态"
      aside={
        <div className="inline-flex min-h-7 items-center rounded-[12px] bg-[rgba(102,115,94,0.12)] px-3 text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">
          AI 信心 {confidence}%
        </div>
      }
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[18px] font-semibold leading-[1.35] tracking-[-0.02em] text-[#202124]">
            {status}
          </p>
          <div className="mt-3 font-display text-[48px] leading-[0.94] tracking-[-0.05em] text-[#181817] md:text-[62px]">
            {score}%
          </div>
          <p className="mt-2 max-w-[15rem] text-[14px] leading-[1.65] text-[#6f747b]">{description}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="inline-flex items-center gap-2 rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">
            <span className="h-2 w-2 rounded-full bg-[#66735E]" />
            基于 {evidenceRules} 条判断与 {evidenceCases} 个案例
          </div>
        </div>
      </div>

      {metrics.length > 0 ? (
        <div className="mt-5 rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-white/78 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">判断维度</p>
              <p className="mt-1 text-[14px] leading-6 text-[#181817]">
                AI 正在从能力、品牌与商业模型三个层面重估这个项目。
              </p>
            </div>
            <div className="rounded-full bg-[rgba(102,115,94,0.10)] px-3 py-1 text-[12px] font-semibold text-[#66735E]">
              持续刷新中
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {metrics.map((item) => (
              <ProgressBar key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </div>
      ) : null}
    </MKCard>
  );
}
