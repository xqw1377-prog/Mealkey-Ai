"use client";

import { useCallback, useMemo } from "react";
import {
  buildRecentSpend,
  buildValueArchive,
  buildWalletView,
  type BillingSnapshotLite,
  type WalletApiPayload,
  type WalletView,
} from "@/lib/business-wallet";
import { trpc } from "@/lib/trpc";

type WalletState = {
  loading: boolean;
  error: string | null;
  wallet: WalletView;
  snapshot: BillingSnapshotLite | null;
  walletPayload: WalletApiPayload | null;
  mode: "live" | "sandbox";
  recentSpend: ReturnType<typeof buildRecentSpend>;
  archive: ReturnType<typeof buildValueArchive>;
  plans: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    priceCents: number;
  }>;
  reload: () => Promise<void>;
};

const emptyWallet = buildWalletView(null);

export function useBusinessWallet(): WalletState {
  const utils = trpc.useUtils();
  const query = trpc.billing.getPlansAndWallet.useQuery(undefined, {
    staleTime: 15_000,
  });

  const snapshot = (query.data?.snapshot || null) as BillingSnapshotLite | null;
  const walletPayload = (query.data?.wallet || null) as WalletApiPayload | null;
  const mode = (query.data?.mode || "sandbox") as "live" | "sandbox";
  const creditPacks = query.data?.categorized.creditPacks || [];
  const allPlans = query.data?.plans || [];
  const plans = (creditPacks.length ? creditPacks : allPlans).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    priceCents: p.priceCents,
  }));

  const reload = useCallback(async () => {
    await utils.billing.getPlansAndWallet.invalidate();
  }, [utils]);

  const wallet = useMemo(
    () => buildWalletView(snapshot, walletPayload),
    [snapshot, walletPayload],
  );
  const recentSpend = useMemo(
    () => buildRecentSpend(snapshot, walletPayload?.recentLedger),
    [snapshot, walletPayload],
  );
  const archive = useMemo(
    () => buildValueArchive(snapshot, walletPayload?.valueArchive),
    [snapshot, walletPayload],
  );

  return {
    loading: query.isLoading,
    error: query.error?.message || null,
    wallet,
    snapshot,
    walletPayload,
    mode,
    recentSpend,
    archive,
    plans,
    reload,
  };
}

export { emptyWallet };
