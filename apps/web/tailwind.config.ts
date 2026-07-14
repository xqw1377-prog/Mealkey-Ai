import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        // md 推迟到 1024px：横屏手机（768-1024px）保持移动布局
        md: "1024px",
        // lg 推迟到 1280px：多栏网格只在宽屏生效
        lg: "1280px",
      },
      colors: {
        primary: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        "sans-cn": ['"PingFang SC"', '"Microsoft YaHei"', "system-ui", "sans-serif"],
        "serif-cn": ['"Songti SC"', '"Noto Serif SC"', "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
