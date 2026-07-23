import { redirect } from "next/navigation";
import { OperatingShell } from "@/components/operating";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <OperatingShell>{children}</OperatingShell>
  );
}
