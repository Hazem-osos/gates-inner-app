import { redirect } from "next/navigation";

/** المسار القديم — يُحوَّل تلقائياً إلى التقارير */
export default function LegacyTransferredClientsRedirect() {
  redirect("/reports/transferred");
}
