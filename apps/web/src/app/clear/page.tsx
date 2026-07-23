import { redirect } from "next/navigation";

/** 短路径入口，避免手输 /fix-cache.html 时粘上说明文字导致 404 */
export default function ClearCacheRedirectPage() {
  redirect("/fix-cache.html");
}
