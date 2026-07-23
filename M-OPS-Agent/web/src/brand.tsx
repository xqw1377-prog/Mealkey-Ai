/** 与 MealKey / M-PNT atelier 母体品牌对齐 */
export const HOST_BRAND = {
  nameZh: "餐启",
  nameEn: "Mealkey",
  positioning: "餐饮经营能力增长系统",
} as const;

export const AGENT_PRODUCT = {
  nameZh: "餐厅经营体检系统",
  nameZhShort: "经营体检",
  nameEn: "Restaurant Health Check",
  lede: "看见经营异常与证据，把值得关注的变化推到你眼前——拍板留在餐启。",
  ledePulse: "今天你的餐厅发生了什么变化，什么最值得你关注。",
  firstMoment: "花几分钟，让我先认识你的店。",
} as const;

/** 与母体看板一致的餐启标（直角深底，对齐 M-PNT atelier） */
export function MealkeyMark({
  className = "",
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={`mk-mark ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="mk-mark-svg" fill="none">
        <circle cx="31" cy="14" r="3.5" fill="#F6F3ED" fillOpacity="0.95" />
        <path
          d="M14 31V17.5L21.5 27L29 17.5V31"
          stroke="#F6F3ED"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M26 27.5H36"
          stroke="#77805F"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function AgentBrandLockup({
  pulse = false,
  compact = false,
}: {
  pulse?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`shell-brand-lockup mops-rise${compact ? " is-compact" : ""}`}>
      <MealkeyMark size={compact ? 36 : 44} />
      <div className="shell-brand-copy">
        <p className="shell-kicker">{HOST_BRAND.nameEn}</p>
        <h1 className="brand">
          {pulse ? "今日经营扫描" : AGENT_PRODUCT.nameZh}
        </h1>
        {!compact ? (
          <>
            <p className="brand-en-sub">{AGENT_PRODUCT.nameEn}</p>
            <p className="lede">
              {pulse ? AGENT_PRODUCT.ledePulse : AGENT_PRODUCT.firstMoment}
            </p>
          </>
        ) : (
          <p className="brand-en-sub">
            {pulse ? AGENT_PRODUCT.ledePulse : "一步一步建立对这家店的认识"}
          </p>
        )}
      </div>
    </div>
  );
}
