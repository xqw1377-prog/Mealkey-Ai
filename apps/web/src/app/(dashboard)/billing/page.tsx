"use client";

import { Suspense } from "react";
import BusinessWalletPage from "./BusinessWalletPage";
import { PageContent } from "@/components/operating/PageContent";

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <PageContent width="wide" inset="shell" className="text-[14px] text-[#6f747b]">
          正在打开经营点中心…
        </PageContent>
      }
    >
      <BusinessWalletPage />
    </Suspense>
  );
}
