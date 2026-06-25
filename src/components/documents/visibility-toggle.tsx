"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  documentId: string;
  initialValue: boolean;
}

export function VisibilityToggle({ documentId, initialValue }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    const newValue = !visible;
    try {
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible_to_employees: newValue }),
      });
      setVisible(newValue);
      router.refresh();
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[13px] font-semibold text-gray-900">Visível para funcionários</div>
        <div className="text-[12px] text-gray-400 mt-0.5">
          {visible ? "Funcionários podem ver este documento" : "Somente admins e superiores podem ver"}
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className="flex-shrink-0 relative cursor-pointer transition-all"
        style={{
          width: 44, height: 24, borderRadius: 12,
          background: visible ? "var(--brand-primary)" : "#d1d5db",
          border: "none",
          padding: 0,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <div
          className="absolute top-[2px] w-5 h-5 rounded-full bg-white transition-all duration-200"
          style={{ left: visible ? 22 : 2, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
        />
      </button>
    </div>
  );
}
