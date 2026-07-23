/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OS_WEB_URL?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_BACKEND_TOKEN?: string;
  readonly VITE_MK_AGENT_SECRET?: string;
  readonly VITE_MK_GATEWAY_URL?: string;
  readonly VITE_MK_GATEWAY_MODE?: string;
  readonly VITE_MK_USER_ACCESS_TOKEN?: string;
  readonly VITE_MK_USE_GATEWAY_CONTEXT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
