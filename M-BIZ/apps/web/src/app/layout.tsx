import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

// Google Fonts 在中国大陆无法访问，回退到系统字体

export const metadata: Metadata = {
  title: "MealKey - AI 餐饮经营大脑",
  description:
    "让你拥有更强的经营大脑。MealKey 帮助餐饮创业者看清方向、提升认知、做出关键决策，并持续积累经营智慧。",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans-cn">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
