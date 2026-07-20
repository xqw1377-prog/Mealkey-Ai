import { redirect } from "next/navigation";

export default function PlatformAdminCognitivePage() {
  redirect("/platform/admin?panel=cognitive");
}
