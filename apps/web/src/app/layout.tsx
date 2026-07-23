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
      <head>
        {/* 清掉其他项目留在 localhost:3000 的 Service Worker，避免白屏卡「加载中」 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(!("serviceWorker" in navigator))return;navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});});if("caches" in window){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k);});});}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans-cn">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
