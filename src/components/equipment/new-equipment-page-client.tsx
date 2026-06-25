"use client";

import { useRouter } from "next/navigation";
import { NewEquipmentModal } from "./new-equipment-modal";

interface Props {
  companyId?: string;
}

export function NewEquipmentPageClient({ companyId }: Props) {
  const router = useRouter();

  return (
    <NewEquipmentModal
      open={true}
      onClose={() => router.push("/equipment")}
      companyId={companyId}
    />
  );
}
