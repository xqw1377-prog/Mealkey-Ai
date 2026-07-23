"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** 仅增强：眼睛切换。主登录不依赖此组件的 JS。 */
export function PasswordReveal({ defaultValue = "" }: { defaultValue?: string }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id="login-password"
        name="password"
        type={show ? "text" : "password"}
        autoComplete="current-password"
        required
        defaultValue={defaultValue}
        className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white py-3 pl-4 pr-12 text-[15px] text-[#171717] outline-none transition focus:border-[#66735E]"
        placeholder="密码"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-0 z-10 flex min-w-11 items-center justify-center rounded-[14px] px-3 text-[#6f747b] transition hover:text-[#171717]"
        aria-label={show ? "隐藏密码" : "显示密码"}
      >
        {show ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
