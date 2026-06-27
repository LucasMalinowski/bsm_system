"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const FINALIZATION_REASONS = [
  "Finalizado",
  "Descartado",
  "Peça indisponível",
  "Aguardando fabricante",
  "Outro",
];

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => Promise<void>;
}

export function TicketFinalizationModal({ open, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reason) return;
    setLoading(true);
    try {
      await onConfirm(reason, notes);
      setReason("");
      setNotes("");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setReason("");
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle>Finalizar Chamado</DialogTitle>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Motivo de encerramento</p>
            <div className="flex flex-wrap gap-2">
              {FINALIZATION_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                  style={
                    reason === r
                      ? { background: "var(--brand-primary)", borderColor: "var(--brand-primary)", color: "#fff" }
                      : { background: "#fff", borderColor: "#d1d5db", color: "#374151" }
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Observações <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva detalhes adicionais..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 resize-none outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="h-9 px-4 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!reason || loading}
            className="h-9 px-5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: "var(--brand-primary)" }}
          >
            {loading ? "Finalizando..." : "Confirmar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
