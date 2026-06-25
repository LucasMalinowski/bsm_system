import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-session";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { NewTicketPageClient } from "@/components/tickets/new-ticket-page-client";

export default async function NewTicketPage() {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!can(user, PERMISSIONS.TICKET_CREATE)) redirect("/tickets");

  return <NewTicketPageClient userRole={user.role} />;
}
