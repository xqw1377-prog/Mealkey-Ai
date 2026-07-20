import { redirect } from "next/navigation";

export default function PlatformAdminMarketplacePage() {
  redirect("/platform/admin?panel=marketplace");
}
