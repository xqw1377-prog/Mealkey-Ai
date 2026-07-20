import { redirect } from "next/navigation";

export default function PlatformAdminObjectsPage() {
  redirect("/platform/admin?panel=objects");
}
