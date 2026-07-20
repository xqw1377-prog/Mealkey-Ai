import { redirect } from "next/navigation";

export default function PlatformAdminLearningPage() {
  redirect("/platform/admin?panel=learning");
}
