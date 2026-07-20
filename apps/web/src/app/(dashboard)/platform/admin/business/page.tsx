import { redirect } from "next/navigation";

/** 域深链：进入可写控制台并定位商业运营域 */
export default function PlatformAdminBusinessPage() {
  redirect("/platform/admin?panel=business");
}
