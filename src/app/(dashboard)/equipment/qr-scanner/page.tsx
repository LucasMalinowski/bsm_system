import { getServerSession } from "@/lib/auth/get-session";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { forbidden, redirect } from "next/navigation";
import { QRScannerClient } from "@/components/equipment/qr-scanner-client";

export default async function QRScannerPage() {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!can(user, PERMISSIONS.EQUIPMENT_READ)) forbidden();

  return <QRScannerClient />;
}
