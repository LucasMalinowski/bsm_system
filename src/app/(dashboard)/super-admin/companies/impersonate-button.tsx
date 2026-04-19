"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImpersonateButton({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const enter = async () => {
    setLoading(true);
    await fetch("/api/super-admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId }),
    });
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" onClick={enter} isLoading={loading}>
      <LogIn className="h-3.5 w-3.5" />
      Entrar
    </Button>
  );
}
