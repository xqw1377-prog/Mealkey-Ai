import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import {
  PRODUCT_BRAND,
  PRODUCT_BRAND_DESCRIPTION,
  PRODUCT_BRAND_TITLE,
} from "@/lib/product-brand";
import "./globals.css";

// Google Fonts 在中国大陆无法访问，回退到系统字体

export const metadata: Metadata = {
  title: `${PRODUCT_BRAND_TITLE} — ${PRODUCT_BRAND.positioning}`,
  description: PRODUCT_BRAND_DESCRIPTION,
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
