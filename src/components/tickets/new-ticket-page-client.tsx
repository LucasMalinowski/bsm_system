"use client";

import { useRouter } from "next/navigation";
import { NewTicketModal } from "./new-ticket-modal";

interface Props {
  userRole: string;
}

export function NewTicketPageClient({ userRole }: Props) {
  const router = useRouter();

  return (
    <NewTicketModal
      open={true}
      onClose={() => router.push("/tickets")}
      userRole={userRole}
    />
  );
}
