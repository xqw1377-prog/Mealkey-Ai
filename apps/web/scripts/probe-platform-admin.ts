import { prisma } from "../src/lib/prisma";
import { getPlatformAdminOverview } from "../src/server/services/platform-admin.service";

async function main() {
  const overview = await getPlatformAdminOverview(prisma);

  console.log(
    JSON.stringify(
      {
        summary: overview.summary,
        counts: {
          organizations: overview.domains.objects.organizations.length,
          plans: overview.domains.objects.plans.length,
          subscriptions: overview.domains.business.subscriptions.length,
          invoices: overview.domains.business.invoices.length,
          listings: overview.domains.marketplace.listings.length,
          learningQueue: overview.domains.learning.queue.length,
          cognitiveSessions: overview.domains.cognitive.sessions.length,
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
