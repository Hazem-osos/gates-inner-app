import { redirect } from "next/navigation";

export default function LegacyReportsRedirect() {
  redirect("/reports/b");
}
