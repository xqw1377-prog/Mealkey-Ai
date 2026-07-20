"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

const RISK_LABEL: Record<string, string> = {
  conservative: "稳健",
  balanced: "平衡",
  aggressive: "进取",
  unknown: "待观察",
};

const STANCE_LABEL: Record<string, string> = {
  follow: "常采纳建议",
  negotiate: "倾向协商修改",
  override: "常坚持己见",
  unknown: "待观察",
};

type Props = {
  projectId: string;
  compact?: boolean;
};

export function IntelligenceProfilePanel({ projectId, compact }: Props) {
  const utils = trpc.useUtils();
  const [previewRule, setPreviewRule] = useState(
    "午市套餐提价后客流下降，晚市未补回",
  );
  const { data, isLoading, error } = trpc.intelligenceRuntime.getProfile.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );
  const { data: industryData } =
    trpc.intelligenceRuntime.listIndustryInsights.useQuery(
      { projectId, limit: 4 },
      { enabled: Boolean(projectId) },
    );
  const updatePerm = trpc.intelligenceRuntime.updatePermissions.useMutation({
    onSuccess: async () => {
      await utils.intelligenceRuntime.getProfile.invalidate({ projectId });
      await utils.intelligenceRuntime.getBrief.invalidate({ projectId });
      await utils.intelligenceRuntime.listIndustryInsights.invalidate({
        projectId,
      });
    },
  });
  const previewEnabled =
    Boolean(projectId) &&
    Boolean(data?.intelligence?.permissions.contributeToIndustryModel) &&
    previewRule.trim().length >= 4;
  const { data: contribPreview, isFetching: previewLoading } =
    trpc.intelligenceRuntime.previewIndustryContribution.useQuery(
      {
        projectId,
        rule: previewRule.trim(),
        outcome: "confirmed",
      },
      { enabled: previewEnabled },
    );

  if (isLoading) {
    return (
      <p className="text-[13px] text-[#6f747b]">加载中…</p>
    );
  }
  if (error) {
    return (
      <p className="text-[13px] text-[#a56b4d]">{error.message}</p>
    );
  }

  const intel = data?.intelligence;
  if (!intel) return null;
  const perm = intel.permissions;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
          做事习惯 · {Math.round(intel.confidence * 100)}%
        </p>
        <p className="mt-2 text-[15px] leading-7 text-[#202124]">
          {intel.personality.summary}
        </p>
        {!compact && intel.personality.traits.length > 0 ? (
          <p className="mt-1 text-[13px] text-[#6f747b]">
            {intel.personality.traits.join(" · ")}
          </p>
        ) : null}
        <p className="mt-2 text-[13px] text-[#6f747b]">
          风险偏好 {RISK_LABEL[intel.decisionStyle.riskPreference] || "待观察"}
          {" · "}
          协作姿态 {STANCE_LABEL[intel.decisionStyle.aiStance] || "待观察"}
          {typeof intel.executionAbility.recentCompletionRate === "number"
            ? ` · 执行完成率 ${Math.round(intel.executionAbility.recentCompletionRate * 100)}%`
            : ""}
        </p>
      </div>

      {!compact && intel.historicalLessons.length > 0 ? (
        <div>
          <p className="text-[11px] tracking-[0.1em] text-[#6f747b]">历史教训</p>
          <ul className="mt-2 space-y-1.5">
            {intel.historicalLessons.slice(0, 4).map((l) => (
              <li key={l.lessonId} className="text-[13px] leading-6 text-[#202124]">
                · {l.summary}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data?.councilWeightHints?.note ? (
        <p className="text-[12px] leading-5 text-[#B47C5C]">
          席位校准：{data.councilWeightHints.note}
        </p>
      ) : null}

      {industryData?.insights && industryData.insights.length > 0 ? (
        <div className="border-t border-[rgba(24,24,23,0.08)] pt-4">
          <p className="text-[11px] tracking-[0.1em] text-[#6f747b]">
            行业规律 · {industryData.category}（已脱敏）
          </p>
          <ul className="mt-2 space-y-1.5">
            {industryData.insights.map((i) => (
              <li key={i.id} className="text-[13px] leading-6 text-[#202124]">
                · {i.rule}
                <span className="text-[#6f747b]">
                  {" "}
                  · 复现 {i.supportCount}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2 border-t border-[rgba(24,24,23,0.08)] pt-4">
        <p className="text-[11px] tracking-[0.1em] text-[#6f747b]">
          记忆权限 · 可随时关
        </p>
        <PermissionToggle
          label="保存本次经验"
          checked={perm.saveExperience}
          disabled={updatePerm.isPending}
          onChange={(v) =>
            updatePerm.mutate({ projectId, saveExperience: v })
          }
        />
        <PermissionToggle
          label="用于个人能力与建议校准"
          checked={perm.useForPersonalGrowth}
          disabled={updatePerm.isPending}
          onChange={(v) =>
            updatePerm.mutate({ projectId, useForPersonalGrowth: v })
          }
        />
        <PermissionToggle
          label="脱敏后贡献行业（默认关）"
          checked={perm.contributeToIndustryModel}
          disabled={updatePerm.isPending}
          onChange={(v) =>
            updatePerm.mutate({ projectId, contributeToIndustryModel: v })
          }
        />
        {perm.contributeToIndustryModel ? (
          <div className="space-y-2">
            <p className="text-[12px] leading-5 text-[#6f747b]">
              已开：会去掉品牌/电话/地址再写入行业池；可随时关。
            </p>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[#6f747b]">
                贡献预览（不写库）
              </span>
              <input
                value={previewRule}
                onChange={(e) => setPreviewRule(e.target.value)}
                className="min-h-10 border border-[rgba(24,24,23,0.1)] bg-white px-3 text-[13px] outline-none focus:border-[#181817]"
                placeholder="例：午市套餐提价后客流下降…"
              />
            </label>
            {previewLoading ? (
              <p className="text-[12px] text-[#6f747b]">预览生成中…</p>
            ) : contribPreview?.preview ? (
              <div className="border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2">
                <p className="text-[11px] tracking-[0.08em] text-[#66735E]">
                  脱敏后写入 · {contribPreview.preview.category}
                </p>
                <p className="mt-1 text-[13px] leading-6 text-[#202124]">
                  {contribPreview.preview.rule}
                </p>
                <p className="mt-1 text-[12px] text-[#6f747b]">
                  结果 {contribPreview.preview.outcome}
                  {" · "}
                  置信 {Math.round(contribPreview.preview.confidence * 100)}%
                  {contribPreview.preview.anonymized ? " · 已脱敏" : ""}
                </p>
              </div>
            ) : previewRule.trim().length >= 4 ? (
              <p className="text-[12px] text-[#6f747b]">
                {contribPreview?.note || "当前规则无法生成预览"}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-[12px] leading-5 text-[#6f747b]">
            关闭时不会把经验写入行业模型。
          </p>
        )}
      </div>
    </div>
  );
}

function PermissionToggle(props: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-5 text-[#202124]">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-[#181817]"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}
