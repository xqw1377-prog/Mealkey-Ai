"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

function getSpeechRecognitionCtor(): BrowserSpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

export function useSpeechToTextField() {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const initialValueRef = useRef("");
  const finalizedTranscriptRef = useRef("");
  const onChangeRef = useRef<((value: string) => void) | null>(null);

  const [speechSupported, setSpeechSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggleFieldRecording = useCallback(
    async (fieldId: string, currentValue: string, onChange: (value: string) => void) => {
      if (recording && activeFieldId === fieldId) {
        stopRecording();
        return;
      }

      if (recording) {
        stopRecording();
      }

      const SpeechRecognitionCtor = getSpeechRecognitionCtor();
      if (!SpeechRecognitionCtor) {
        setSpeechError("当前浏览器暂不支持语音转文字。");
        return;
      }

      setSpeechError(null);
      setRecording(true);
      setActiveFieldId(fieldId);
      initialValueRef.current = currentValue.trim();
      finalizedTranscriptRef.current = "";
      onChangeRef.current = onChange;

      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "zh-CN";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result[0]?.transcript?.trim() ?? "";
          if (!transcript) continue;

          if (result.isFinal) {
            finalizedTranscriptRef.current = `${finalizedTranscriptRef.current} ${transcript}`.trim();
          } else {
            interimTranscript = `${interimTranscript} ${transcript}`.trim();
          }
        }

        const combinedTranscript = `${finalizedTranscriptRef.current} ${interimTranscript}`.trim();
        const nextValue = [initialValueRef.current, combinedTranscript].filter(Boolean).join("\n");
        onChangeRef.current?.(nextValue);
      };
      recognition.onerror = (event) => {
        setSpeechError(
          event.error === "not-allowed" ? "请先允许麦克风权限。" : "语音识别失败，请再试一次。",
        );
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setRecording(false);
        setActiveFieldId(null);
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch {
        recognitionRef.current = null;
        setRecording(false);
        setActiveFieldId(null);
        setSpeechError("语音识别启动失败，请刷新后重试。");
      }
    },
    [activeFieldId, recording, stopRecording],
  );

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionCtor()));
    return () => recognitionRef.current?.stop();
  }, []);

  return {
    speechSupported,
    recording,
    activeFieldId,
    speechError,
    toggleFieldRecording,
    stopRecording,
  };
}
