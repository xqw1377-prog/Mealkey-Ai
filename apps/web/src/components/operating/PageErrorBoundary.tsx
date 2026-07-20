"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
};

type State = { error: Error | null };

/**
 * 页面级错误边界，避免子树崩溃拖垮整页。
 */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[PageErrorBoundary]", error, info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-[12px] tracking-[0.1em] text-[#B47C5C]">页面出错</p>
          <h2 className="mt-2 font-display text-[22px] font-semibold text-[#202124]">
            {this.props.fallbackTitle || "这部分暂时无法显示"}
          </h2>
          <p className="mt-3 text-[14px] leading-6 text-[#6f747b]">
            {this.state.error.message || "发生未知错误"}
          </p>
          <button
            type="button"
            className="mt-6 inline-flex min-h-11 items-center justify-center bg-[#181817] px-5 text-[14px] font-semibold text-white"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
