"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isWeChatBrowser } from "@/lib/wechat-browser";

type BrowserSpeechRecognitionResult = {
  0: {
    transcript: string;
  };
  isFinal: boolean;
  length: number;
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

export type SpeechCloudUploadOptions = {
  projectId: string;
  /** 上传标题；店访须含「店访」以触发 requireCloudAsr */
  title: string;
  categorySlug?: string;
  /**
   * 一手事实场景：禁止把浏览器听写当作 transcriptHint 冒充转写
   */
  forbidTranscriptHint?: boolean;
  /**
   * 松手转写完成后回调完整字段值（含原有 draft）
   * Mobile Agent 用于「说完即编译」
   */
  onFinalTranscript?: (fullText: string) => void;
};

function getSpeechRecognitionCtor(): BrowserSpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

function mediaRecorderSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

const MAX_VOICE_SECONDS = 60;

/**
 * 按住说话：优先 MediaRecorder → 云端 ASR；有 Web Speech 时作 interim 预览。
 * 传入 cloud 后，微信无 Web Speech 仍可按住说话。
 */
export function useSpeechToTextField(cloud?: SpeechCloudUploadOptions) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const holdActiveRef = useRef(false);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef(0);
  const initialValueRef = useRef("");
  const finalizedTranscriptRef = useRef("");
  const onChangeRef = useRef<((value: string) => void) | null>(null);

  const [speechSupported, setSpeechSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current != null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const stopBrowserSpeech = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    holdActiveRef.current = false;
    clearRecordingTimer();
    stopBrowserSpeech();
    setRecordingSeconds(0);
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      } else if (!recorderRef.current) {
        setRecording(false);
        setActiveFieldId(null);
      }
    } catch {
      setRecording(false);
      setActiveFieldId(null);
    }
  }, [clearRecordingTimer, stopBrowserSpeech]);

  const uploadCloudAudio = useCallback(
    async (audioFile: File, transcriptHint?: string) => {
      if (!cloud) return null;
      setUploading(true);
      setSpeechError(null);
      try {
        const formData = new FormData();
        formData.append("file", audioFile);
        formData.append("projectId", cloud.projectId);
        formData.append("title", cloud.title);
        if (cloud.categorySlug) {
          formData.append("categorySlug", cloud.categorySlug);
        }
        if (transcriptHint && !cloud.forbidTranscriptHint) {
          formData.append("transcriptHint", transcriptHint);
        }
        const response = await fetch("/api/assets/upload", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const errBody = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errBody.error || `上传失败（${response.status}）`);
        }
        const payload = (await response.json()) as {
          asset?: { transcript?: string | null };
          error?: string;
        };
        const transcript = (payload.asset?.transcript || "").trim();
        if (!transcript || transcript === "[无语音内容]") {
          setSpeechError(
            cloud.forbidTranscriptHint
              ? "录音已保存，但云端转写未成功。请检查 DashScope/通义 Key，或手填证据句。"
              : "没听成字。请再按住说清楚一点，或直接打字。",
          );
          return null;
        }
        return transcript;
      } catch (err) {
        setSpeechError(err instanceof Error ? err.message : "上传转写失败");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [cloud],
  );

  const startFieldRecording = useCallback(
    async (
      fieldId: string,
      currentValue: string,
      onChange: (value: string) => void,
    ) => {
      if (recording && activeFieldId === fieldId) return;
      if (recording) stopRecording();
      if (uploading) return;

      const canCloud = Boolean(cloud && mediaRecorderSupported());
      const SpeechRecognitionCtor = getSpeechRecognitionCtor();

      if (!canCloud && !SpeechRecognitionCtor) {
        setSpeechError(
          isWeChatBrowser()
            ? "当前环境无法录音。请允许麦克风，或点右上角 ··· → 在浏览器打开。"
            : "这个浏览器暂不支持语音。请用手机系统浏览器打开，或改用打字。",
        );
        return;
      }

      holdActiveRef.current = true;
      setSpeechError(null);
      setRecording(true);
      setActiveFieldId(fieldId);
      initialValueRef.current = currentValue.trim();
      finalizedTranscriptRef.current = "";
      onChangeRef.current = onChange;
      recordingStartedAtRef.current = Date.now();

      const applyPreview = (combined: string) => {
        const nextValue = [initialValueRef.current, combined]
          .filter(Boolean)
          .join("\n");
        onChangeRef.current?.(nextValue);
      };

      // 云端路径：MediaRecorder + 可选 Web Speech interim
      if (canCloud) {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          holdActiveRef.current = false;
          setRecording(false);
          setActiveFieldId(null);
          setSpeechError(
            isWeChatBrowser()
              ? "打不开麦克风。请允许权限，或点 ··· 用系统浏览器打开后再说。"
              : "打不开麦克风。请允许麦克风权限后，再按住说话。",
          );
          return;
        }

        if (!holdActiveRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          setRecording(false);
          setActiveFieldId(null);
          return;
        }

        mediaStreamRef.current = stream;
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        recorderChunksRef.current = [];
        recorderRef.current = recorder;

        if (SpeechRecognitionCtor && !cloud?.forbidTranscriptHint) {
          const recognition = new SpeechRecognitionCtor();
          recognition.lang = "zh-CN";
          recognition.interimResults = true;
          recognition.continuous = true;
          recognition.onresult = (event) => {
            let interimTranscript = "";
            for (
              let index = event.resultIndex;
              index < event.results.length;
              index += 1
            ) {
              const result = event.results[index];
              const transcript = result[0]?.transcript?.trim() ?? "";
              if (!transcript) continue;
              if (result.isFinal) {
                finalizedTranscriptRef.current =
                  `${finalizedTranscriptRef.current} ${transcript}`.trim();
              } else {
                interimTranscript = `${interimTranscript} ${transcript}`.trim();
              }
            }
            applyPreview(
              `${finalizedTranscriptRef.current} ${interimTranscript}`.trim(),
            );
          };
          recognition.onerror = () => {
            /* 云端仍可转写 */
          };
          recognition.onend = () => {
            recognitionRef.current = null;
          };
          recognitionRef.current = recognition;
          try {
            recognition.start();
          } catch {
            recognitionRef.current = null;
          }
        }

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recorderChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          clearRecordingTimer();
          setRecording(false);
          setActiveFieldId(null);
          stopBrowserSpeech();
          mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
          recorderRef.current = null;

          const audioBlob = new Blob(recorderChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          const transcriptHint = finalizedTranscriptRef.current.trim();

          if (audioBlob.size < 800 && !transcriptHint) {
            setSpeechError("没听清。请按住多说两句，再说完松手。");
            return;
          }

          const extension = (recorder.mimeType || "").includes("mp4")
            ? "m4a"
            : "webm";
          const audioFile = new File(
            [audioBlob],
            `hold-talk-${Date.now()}.${extension}`,
            { type: recorder.mimeType || "audio/webm" },
          );
          const transcript = await uploadCloudAudio(
            audioFile,
            transcriptHint || undefined,
          );
          if (transcript) {
            const nextValue = [initialValueRef.current, transcript]
              .filter(Boolean)
              .join("\n");
            onChangeRef.current?.(nextValue);
            cloud?.onFinalTranscript?.(nextValue);
          } else if (transcriptHint && !cloud?.forbidTranscriptHint) {
            const nextValue = [initialValueRef.current, transcriptHint]
              .filter(Boolean)
              .join("\n");
            applyPreview(transcriptHint);
            cloud?.onFinalTranscript?.(nextValue);
          }
        };

        recorder.start(250);
        clearRecordingTimer();
        setRecordingSeconds(0);
        recordingTimerRef.current = window.setInterval(() => {
          const elapsed = Math.floor(
            (Date.now() - recordingStartedAtRef.current) / 1000,
          );
          setRecordingSeconds(elapsed);
          if (elapsed >= MAX_VOICE_SECONDS) {
            stopRecording();
          }
        }, 250);

        if (!holdActiveRef.current) {
          stopRecording();
        }
        return;
      }

      // 纯 Web Speech 回退（无 cloud）
      if (!SpeechRecognitionCtor) {
        holdActiveRef.current = false;
        setRecording(false);
        setActiveFieldId(null);
        return;
      }

      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "zh-CN";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event) => {
        let interimTranscript = "";
        for (
          let index = event.resultIndex;
          index < event.results.length;
          index += 1
        ) {
          const result = event.results[index];
          const transcript = result[0]?.transcript?.trim() ?? "";
          if (!transcript) continue;
          if (result.isFinal) {
            finalizedTranscriptRef.current =
              `${finalizedTranscriptRef.current} ${transcript}`.trim();
          } else {
            interimTranscript = `${interimTranscript} ${transcript}`.trim();
          }
        }
        applyPreview(
          `${finalizedTranscriptRef.current} ${interimTranscript}`.trim(),
        );
      };
      recognition.onerror = (event) => {
        setSpeechError(
          event.error === "not-allowed"
            ? "请先允许麦克风权限，再按住说话。"
            : "没听清，请再按住说一次。",
        );
        setRecording(false);
        setActiveFieldId(null);
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setRecording(false);
        setActiveFieldId(null);
        // 纯 Web Speech 回退：松手即回调；云端路径由 MediaRecorder.onstop 负责，避免双发
        const finalText = [
          initialValueRef.current,
          finalizedTranscriptRef.current.trim(),
        ]
          .filter(Boolean)
          .join("\n");
        if (finalText.trim()) {
          onChangeRef.current?.(finalText);
          cloud?.onFinalTranscript?.(finalText);
        }
      };
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        recognitionRef.current = null;
        setRecording(false);
        setActiveFieldId(null);
        setSpeechError("语音没启动成功，请刷新后再按住说话。");
      }
    },
    [
      activeFieldId,
      clearRecordingTimer,
      cloud,
      recording,
      stopBrowserSpeech,
      stopRecording,
      uploadCloudAudio,
      uploading,
    ],
  );

  const toggleFieldRecording = useCallback(
    async (
      fieldId: string,
      currentValue: string,
      onChange: (value: string) => void,
    ) => {
      if (recording && activeFieldId === fieldId) {
        stopRecording();
        return;
      }
      await startFieldRecording(fieldId, currentValue, onChange);
    },
    [activeFieldId, recording, startFieldRecording, stopRecording],
  );

  const cloudEnabled = Boolean(cloud?.projectId);
  const cloudProjectId = cloud?.projectId;
  useEffect(() => {
    const supported = Boolean(
      getSpeechRecognitionCtor() || (cloudEnabled && mediaRecorderSupported()),
    );
    setSpeechSupported(supported);
    if (!supported && isWeChatBrowser() && !cloudEnabled) {
      setSpeechError(
        "微信里不好用语音。点右上角 ··· → 在浏览器打开，再按住说话。",
      );
    }
    return () => {
      holdActiveRef.current = false;
      clearRecordingTimer();
      stopBrowserSpeech();
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [clearRecordingTimer, cloudEnabled, cloudProjectId, stopBrowserSpeech]);

  return {
    speechSupported,
    recording,
    uploading,
    activeFieldId,
    speechError,
    recordingSeconds,
    maxVoiceSeconds: MAX_VOICE_SECONDS,
    startFieldRecording,
    toggleFieldRecording,
    stopRecording,
  };
}
