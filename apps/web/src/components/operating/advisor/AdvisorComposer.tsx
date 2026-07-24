"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  History,
  ImageIcon,
  LoaderCircle,
  Mic,
  Paperclip,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import {
  HoldToTalkBanner,
  HoldToTalkButton,
} from "@/components/operating/HoldToTalkButton";

export type ComposerAsset = {
  id: string;
  title: string;
  kind: "audio" | "image" | "video" | "document";
  summary: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export type ComposerCategory = {
  id: string;
  name: string;
};

type Props = {
  projectId: string;
  input: string;
  onInputChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onFileChange: (files: FileList | null) => void;
  onDeleteAsset: (assetId: string) => void;
  onShowHistory: () => void;
  selectedAssetIds: string[];
  onSelectedAssetIdsChange: (ids: string[]) => void;
  assetLibrary: ComposerAsset[];
  assetCategories: ComposerCategory[];
  selectedCategoryId: string;
  onSelectedCategoryIdChange: (id: string) => void;
  primaryComposerPrompts: Array<{ label: string; prompt: string }>;
  finalizeDecisionPrompt: string;
  uploading?: boolean;
  uploadError?: string | null;
  uploadSuccess?: string | null;
  onClearUploadError?: () => void;
  recording?: boolean;
  recordingSeconds?: number;
  maxRecordingSeconds?: number;
  recordingTranscript?: string;
  voiceTip?: string | null;
  onDismissVoiceTip?: () => void;
  streaming?: boolean;
  deletingAsset?: boolean;
};

/**
 * 会议页底部 sticky 输入区：工具条 / 资料库 / 发送与录音。
 */
export function AdvisorComposer({
  projectId,
  input,
  onInputChange,
  onKeyDown,
  onSend,
  onStartRecording,
  onStopRecording,
  onFileChange,
  onDeleteAsset,
  onShowHistory,
  selectedAssetIds,
  onSelectedAssetIdsChange,
  assetLibrary,
  assetCategories,
  selectedCategoryId,
  onSelectedCategoryIdChange,
  primaryComposerPrompts,
  finalizeDecisionPrompt,
  uploading,
  uploadError,
  uploadSuccess,
  onClearUploadError,
  recording,
  recordingSeconds = 0,
  maxRecordingSeconds = 60,
  recordingTranscript,
  voiceTip,
  onDismissVoiceTip,
  streaming,
  deletingAsset,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMobileTools, setShowMobileTools] = useState(false);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [pendingDeleteAssetId, setPendingDeleteAssetId] = useState<string | null>(
    null,
  );
  const visibleAssets = showAllAssets
    ? assetLibrary
    : assetLibrary.slice(0, 4);
  const hiddenAssetCount = Math.max(0, assetLibrary.length - 4);

  const selectedAssets = assetLibrary.filter((asset) =>
    selectedAssetIds.includes(asset.id),
  );

  return (
    <div className="sticky bottom-0 z-20 border-t border-[rgba(24,24,23,0.08)] bg-[rgba(250,249,246,0.98)] px-4 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur-xl md:px-6 md:py-3">
      <div className="mb-2 md:hidden">
        <button
          type="button"
          onClick={() => setShowMobileTools((value) => !value)}
          className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3.5 text-[12px] font-medium text-[#202124]"
        >
          <span>更多工具</span>
          {showMobileTools ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      <div
        className={`mb-2 rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-2 md:mb-3 md:block md:p-3 ${
          showMobileTools ? "block" : "hidden"
        }`}
      >
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
          <button
            type="button"
            onClick={() => {
              onInputChange(finalizeDecisionPrompt);
              setShowMobileTools(false);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-3.5 text-[13px] font-semibold text-white transition hover:-translate-y-0.5 active:scale-[0.98]"
          >
            形成经营决策
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            href={`/projects/${projectId}/decisions`}
            prefetch={false}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-3.5 text-[13px] font-semibold text-[#202124]"
          >
            去跟进
            <History className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => {
              onShowHistory();
              setShowMobileTools(false);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-3.5 text-[13px] font-semibold text-[#202124] md:hidden"
          >
            会商历史
            <History className="h-4 w-4" />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.json"
        className="hidden"
        onChange={(event) => {
          onFileChange(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="mb-2 hidden flex-wrap items-center gap-2 md:mb-3 md:flex">
        {primaryComposerPrompts.map((item) => (
          <button
            key={`composer-${item.label}`}
            type="button"
            onClick={() => onInputChange(item.prompt)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[12px] font-medium text-[#202124]"
          >
            {item.label}
          </button>
        ))}
        {uploading || selectedAssetIds.length > 0 ? (
          <div className="inline-flex min-h-11 items-center rounded-full bg-[rgba(102,115,94,0.08)] px-4 text-[13px] text-[#66735E]">
            {uploading ? "资料处理中..." : `已选资料 ${selectedAssetIds.length} 份`}
          </div>
        ) : null}
      </div>

      {selectedAssets.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2 md:mb-3">
          {selectedAssets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() =>
                onSelectedAssetIdsChange(
                  selectedAssetIds.filter((id) => id !== asset.id),
                )
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#EEF1EA] px-4 text-[13px] text-[#202124] touch-manipulation"
            >
              <span>{asset.title}</span>
              <span className="text-[#66735E]">移除</span>
            </button>
          ))}
        </div>
      ) : null}

      {showAssetLibrary ? (
        <div className="mb-3 rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">
                资料
              </p>
              <p className="text-[12px] leading-5 text-[#6f747b]">
                只选这次要用的证据。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedCategoryId}
                onChange={(event) => onSelectedCategoryIdChange(event.target.value)}
                className="min-h-11 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[12px] text-[#202124] focus:outline-none"
              >
                {assetCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || streaming}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[12px] font-medium text-[#202124] disabled:opacity-50"
              >
                <Paperclip className="h-4 w-4" />
                {uploading ? "上传中..." : "上传"}
              </button>
            </div>
          </div>

          {uploading ? (
            <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-[rgba(102,115,94,0.08)] px-4 py-3 text-[13px] text-[#66735E]">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              <span>资料处理中，语音/图片可能需要几秒...</span>
            </div>
          ) : uploadError ? (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-[14px] bg-[rgba(180,124,92,0.10)] px-4 py-3 text-[13px] text-[#B47C5C]">
              <span>{uploadError}</span>
              <button
                type="button"
                onClick={onClearUploadError}
                className="shrink-0 text-[12px] underline"
              >
                关闭
              </button>
            </div>
          ) : uploadSuccess ? (
            <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-[rgba(102,115,94,0.12)] px-4 py-3 text-[13px] text-[#66735E]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          ) : null}

          <div className="mt-3 grid gap-2">
            {visibleAssets.map((asset) => (
              <div
                key={asset.id}
                className={`flex items-center gap-2 rounded-[14px] border px-3 py-2.5 transition ${
                  selectedAssetIds.includes(asset.id)
                    ? "border-[#66735E] bg-[rgba(102,115,94,0.08)]"
                    : "border-[rgba(24,24,23,0.08)] bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    onSelectedAssetIdsChange(
                      selectedAssetIds.includes(asset.id)
                        ? selectedAssetIds.filter((id) => id !== asset.id)
                        : [...selectedAssetIds, asset.id],
                    )
                  }
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-[13px] font-medium leading-6 text-[#202124]">
                    {asset.title}
                  </p>
                  <p className="truncate text-[12px] leading-5 text-[#6f747b]">
                    {asset.category?.name ?? "未分类"} ·{" "}
                    {asset.summary ?? "已导入资料"}
                  </p>
                </button>
                <div className="shrink-0 text-[#6f747b]">
                  {asset.kind === "audio" ? <Mic className="h-4 w-4" /> : null}
                  {asset.kind === "image" ? <ImageIcon className="h-4 w-4" /> : null}
                  {asset.kind === "video" ? <Video className="h-4 w-4" /> : null}
                  {asset.kind === "document" ? (
                    <FileText className="h-4 w-4" />
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDeleteAssetId(asset.id)}
                  disabled={deletingAsset}
                  className="shrink-0 rounded-full p-1.5 text-[#8b877f] transition hover:bg-[rgba(180,124,92,0.10)] hover:text-[#B47C5C] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="删除资料"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!showAllAssets && hiddenAssetCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllAssets(true)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-[14px] border border-dashed border-[rgba(24,24,23,0.12)] bg-white px-3 text-[13px] font-medium text-[#66735E] touch-manipulation"
              >
                还有 {hiddenAssetCount} 条资料
              </button>
            ) : null}
            {showAllAssets && assetLibrary.length > 4 ? (
              <button
                type="button"
                onClick={() => setShowAllAssets(false)}
                className="inline-flex min-h-11 w-full items-center justify-center text-[13px] font-medium text-[#6f747b] touch-manipulation"
              >
                收起资料列表
              </button>
            ) : null}
            {pendingDeleteAssetId ? (
              <div className="rounded-[14px] border border-[rgba(180,124,92,0.22)] bg-[rgba(180,124,92,0.08)] px-3 py-3">
                <p className="text-[13px] text-[#8A4F31]">
                  确认删除这份资料？删除后不可恢复。
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteAsset(pendingDeleteAssetId);
                      setPendingDeleteAssetId(null);
                    }}
                    className="inline-flex min-h-11 items-center rounded-full bg-[#181817] px-3 text-[12px] font-medium text-white"
                  >
                    确认删除
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteAssetId(null)}
                    className="inline-flex min-h-11 items-center rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[12px] font-medium text-[#202124]"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : null}
            {assetLibrary.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-[rgba(24,24,23,0.10)] bg-white px-3 py-4 text-[12px] leading-5 text-[#6f747b]">
                还没有资料，先上传再纳入本次判断。
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="w-full rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-2 py-2">
        <p className="px-3 pt-1 text-[11px] leading-4 tracking-[0.04em] text-[#6f747b]">
          不会打字也没关系 · 按住绿色麦克风，像发微信语音一样说
        </p>
        <HoldToTalkBanner
          recording={Boolean(recording)}
          seconds={recordingSeconds}
          maxSeconds={maxRecordingSeconds}
          interimText={recordingTranscript}
          tip={voiceTip}
          onDismissTip={onDismissVoiceTip}
        />
        {!recording && !voiceTip && !uploadError ? (
          <p className="mb-1 px-3 text-[12px] leading-4 text-[#6f747b]">
            按住说 → 松手成字 → 不对就改 → 再说一段也行
          </p>
        ) : null}
        {uploading && !recording ? (
          <p className="mb-1 px-3 text-[12px] leading-4 text-[#66735E]">
            正在把你的话听成字，稍等几秒…
          </p>
        ) : null}
        {uploadError ? (
          <div className="mb-2 mx-1 flex items-center justify-between gap-2 rounded-[14px] bg-[rgba(180,124,92,0.10)] px-3 py-2 text-[13px] text-[#B47C5C]">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={onClearUploadError}
              className="shrink-0 text-[12px] underline"
            >
              关闭
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-1.5">
          <button
            type="button"
            onClick={() => setShowAssetLibrary((value) => !value)}
            disabled={uploading || streaming}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-[#202124] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={showAssetLibrary ? "收起资料面板" : "打开资料面板"}
          >
            {uploading ? (
              <LoaderCircle className="h-5 w-5 animate-spin text-[#66735E]" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <textarea
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={recording ? "正在听你说…" : "打字，或按住右边说话…"}
              rows={2}
              className="block min-h-[52px] w-full resize-none rounded-[12px] border-0 bg-transparent px-2 py-2 text-[16px] text-[#202124] placeholder:text-[#6f747b] focus:outline-none focus:ring-0 md:min-h-[60px] md:text-[15px]"
              disabled={streaming || uploading}
            />
          </div>
          <HoldToTalkButton
            recording={Boolean(recording)}
            disabled={uploading || streaming}
            hasContent={Boolean(input.trim() || selectedAssetIds.length > 0)}
            onSend={() => void onSend()}
            onPressStart={onStartRecording}
            onPressEnd={onStopRecording}
          />
        </div>
      </div>
    </div>
  );
}
