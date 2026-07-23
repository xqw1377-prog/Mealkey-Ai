/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@mealkey/business-signal-engine", "@mealkey/agents"],
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        // Agent 语音输入需要麦克风；勿全局禁死
        value: "camera=(), microphone=(self), geolocation=(), payment=()",
      },
      {
        key: "Content-Security-Policy",
        // 开发态必须允许 unsafe-eval（Next/webpack），否则 SSR 有界面但按钮/API 全死
        // 生产仍可收紧为 nonce；connect-src 含 ws/wss 供 HMR
        value:
          process.env.NODE_ENV === "production"
            ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.deepseek.com https://dashscope.aliyuncs.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
            : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss: http://localhost:* https://api.deepseek.com https://dashscope.aliyuncs.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
      },
    ];

    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
