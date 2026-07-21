/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OS_WEB_URL?: string;
  readonly VITE_MK_AGENT_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
