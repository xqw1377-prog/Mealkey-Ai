"use client";

import Link from "next/link";

export type OpsSecondaryLink = {
  href: string;
  label: string;
};

type Props = {
  projectId?: string | null;
  /** 覆盖默认链；不传则按 projectId 生成经营动态 / 能力 / 设置 */
  links?: OpsSecondaryLink[];
  className?: string;
};

/**
 * Ops 面二级发现链（不占底栏）。
 * 默认：经营动态 · 能力一览 · 企业设置
 */
export function OpsSecondaryLinks({
  projectId,
  links,
  className = "",
}: Props) {
  const items: OpsSecondaryLink[] =
    links ??
    (projectId
      ? [
          { href: "/dashboard?radar=1", label: "经营动态" },
          { href: `/projects/${projectId}/capability`, label: "能力一览" },
          { href: `/projects/${projectId}/settings`, label: "企业设置" },
        ]
      : [{ href: "/dashboard?radar=1", label: "经营动态" }]);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="相关入口"
      className={`flex flex-wrap gap-x-4 gap-y-2 text-[13px] ${className}`}
    >
      {items.map((item) => (
        <Link
          key={`${item.href}:${item.label}`}
          href={item.href}
          prefetch={false}
          className="font-medium text-[#66735E] no-underline underline-offset-2 hover:underline"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
