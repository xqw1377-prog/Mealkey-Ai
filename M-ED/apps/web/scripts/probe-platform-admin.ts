import { prisma } from "../src/lib/prisma";
import { getPlatformAdminOverview } from "../src/server/services/platform-admin.service";

async function main() {
  const overview = await getPlatformAdminOverview(prisma);

  console.log(
    JSON.stringify(
      {
        summary: overview.summary,
        counts: {
          organizations: overview.organizations.length,
          plans: overview.plans.length,
          subscriptions: overview.subscriptions.length,
          invoices: overview.invoices.length,
          listings: overview.listings.length,
          learningQueue: overview.learningQueue.length,
          cognitiveSessions: overview.cognitiveSessions.length,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
