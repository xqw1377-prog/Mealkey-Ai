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
  const devOnlyExternalScriptGuard =
    process.env.NODE_ENV !== "production"
      ? `
        (function () {
          function isExtensionSource(value) {
            return typeof value === "string" && value.indexOf("chrome-extension://") === 0;
          }

          window.addEventListener(
            "error",
            function (event) {
              if (isExtensionSource(event.filename)) {
                event.preventDefault();
                event.stopImmediatePropagation();
              }
            },
            true
          );

          window.addEventListener(
            "unhandledrejection",
            function (event) {
              var reason = event.reason;
              var stack =
                reason && typeof reason === "object" && typeof reason.stack === "string"
                  ? reason.stack
                  : "";
              var message =
                reason && typeof reason === "object" && typeof reason.message === "string"
                  ? reason.message
                  : String(reason || "");

              if (isExtensionSource(stack) || isExtensionSource(message)) {
                event.preventDefault();
                event.stopImmediatePropagation();
              }
            },
            true
          );
        })();
      `
      : "";

  return (
    <html lang="zh-CN">
      <head>
        {/*
          只注销已有 Service Worker，绝不 register（自毁 SW + navigate 会打断 hydration，导致按钮全死）。
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});});}if("caches" in window){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k);});});}}catch(e){}})();`,
          }}
        />
        {devOnlyExternalScriptGuard ? (
          <script
            dangerouslySetInnerHTML={{
              __html: devOnlyExternalScriptGuard,
            }}
          />
        ) : null}
      </head>
      <body className="font-sans-cn">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
