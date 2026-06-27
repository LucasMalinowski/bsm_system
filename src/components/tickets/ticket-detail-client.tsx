"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/ticket-status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils/format";
import { TicketFinalizationModal } from "@/components/tickets/ticket-finalization-modal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, AlertCircle, FileText } from "lucide-react";
import type { Ticket, TicketComment } from "@/types";

const VALID_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  open:        [{ value: "in_progress", label: "Iniciar" }, { value: "closed", label: "Fechar" }],
  in_progress: [{ value: "waiting", label: "Aguardar" }, { value: "resolved", label: "Resolver" }, { value: "closed", label: "Fechar" }],
  waiting:     [{ value: "in_progress", label: "Retomar" }, { value: "resolved", label: "Resolver" }, { value: "closed", label: "Fechar" }],
  resolved:    [{ value: "closed", label: "Fechar" }, { value: "open", label: "Reabrir" }],
  closed:      [{ value: "open", label: "Reabrir" }],
};

const STATUS_COLORS: Record<string, string> = {
  in_progress: "#0363a9",
  waiting:     "#9ca3af",
  resolved:    "#16a34a",
  closed:      "#374151",
  open:        "#3b82f6",
};

interface Props {
  ticket: Ticket & { comments?: TicketComment[] };
  canUpdate: boolean;
  canComment: boolean;
  canAssign: boolean;
  currentUserId: string;
}

export function TicketDetailClient({ ticket, canUpdate, canComment, canAssign, currentUserId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(ticket.status);
  const [comments, setComments] = useState<TicketComment[]>(ticket.comments ?? []);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalizationOpen, setFinalizationOpen] = useState(false);
  const [budgetUrl, setBudgetUrl] = useState(ticket.budget_url);
  const [budgetUploading, setBudgetUploading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`ticket-comments-${ticket.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_comments", filter: `ticket_id=eq.${ticket.id}` },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new as unknown as TicketComment;
          setComments((prev) =>
            prev.find((c) => c.id === row.id) ? prev : [...prev, row]
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticket.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const transitions = VALID_TRANSITIONS[status] ?? [];

  const changeStatus = async (newStatus: string, extras?: Record<string, unknown>) => {
    setUpdatingStatus(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extras }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao atualizar status");
      }
      setStatus(newStatus as Ticket["status"]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleFinalize = async (reason: string, notes: string) => {
    await changeStatus("closed", { finalization_reason: reason, finalization_notes: notes });
    setFinalizationOpen(false);
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setSubmittingComment(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody }),
      });
      if (!res.ok) throw new Error("Erro ao enviar comentário");
      const { data } = await res.json();
      setComments((prev) =>
        prev.find((c) => c.id === data.id) ? prev : [...prev, data]
      );
      setCommentBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tickets" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{ticket.title}</h1>
            {ticket.is_support_request && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-700">
                <AlertCircle className="h-3 w-3" />
                Suporte BSM
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">
            Aberto por {ticket.creator?.name} · {formatDateTime(ticket.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <TicketStatusBadge status={status} />
          <TicketPriorityBadge priority={ticket.priority} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {ticket.photo_url && (
            <Card>
              <CardHeader>
                <CardTitle>Foto</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={ticket.photo_url}
                  alt="Foto do chamado"
                  className="rounded-lg max-h-80 object-contain w-full bg-gray-50"
                />
              </CardContent>
            </Card>
          )}

          {canUpdate && (
            <Card>
              <CardHeader>
                <CardTitle>Orçamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {budgetUrl && (
                  <a
                    href={budgetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                    style={{ color: "var(--brand-primary)" }}
                  >
                    <FileText className="h-4 w-4" />
                    Ver Orçamento
                  </a>
                )}
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer">
                    <span className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2">
                      {budgetUrl ? "Substituir arquivo" : "Anexar orçamento (PDF, Excel, Word)"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.xls,.xlsx,.doc,.docx"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setBudgetUploading(true);
                        try {
                          const fd = new FormData();
                          fd.append("file", file);
                          const r = await fetch(`/api/tickets/${ticket.id}/budget`, { method: "POST", body: fd });
                          if (!r.ok) throw new Error("Falha no upload");
                          const { url } = await r.json();
                          await fetch(`/api/tickets/${ticket.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ budget_url: url }),
                          });
                          setBudgetUrl(url);
                        } catch {
                          setError("Erro ao enviar orçamento");
                        } finally {
                          setBudgetUploading(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                  {budgetUploading && <span className="text-xs text-gray-400">Enviando...</span>}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Comentários ({comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
                {comments.length === 0 && (
                  <p className="text-sm text-gray-400">Nenhum comentário ainda</p>
                )}
                {comments.map((cm) => {
                  const isSelf = cm.user_id === currentUserId;
                  return (
                    <div key={cm.id} className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
                      {!isSelf && (
                        <p className="text-xs text-gray-500 mb-1 ml-1">{cm.user?.name ?? "Usuário"}</p>
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          isSelf ? "rounded-br-sm text-white" : "rounded-bl-sm bg-gray-100 text-gray-900"
                        }`}
                        style={isSelf ? { background: "var(--brand-primary)" } : undefined}
                      >
                        <p className="whitespace-pre-wrap">{cm.body}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 mx-1">{formatDateTime(cm.created_at)}</p>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {canComment && (
                <form onSubmit={submitComment} className="flex gap-3 pt-2 border-t border-gray-100">
                  <div className="flex-1">
                    <textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Adicionar comentário..."
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 resize-none outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        type="submit"
                        disabled={submittingComment || !commentBody.trim()}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                        style={{ background: "var(--brand-primary)" }}
                      >
                        {submittingComment ? "Enviando..." : "Comentar"}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Responsável</p>
                <p className="font-medium">{ticket.assignee?.name ?? "Não atribuído"}</p>
              </div>
              {ticket.equipment && (
                <div>
                  <p className="text-xs text-gray-500">Equipamento</p>
                  <Link href={`/equipment/${ticket.equipment.id}`} className="font-medium hover:underline" style={{ color: "var(--brand-primary)" }}>
                    {ticket.equipment.name}
                  </Link>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Atualizado</p>
                <p>{formatDateTime(ticket.updated_at)}</p>
              </div>
              {ticket.picked_up_at && (
                <div>
                  <p className="text-xs text-gray-500">Equipamento retirado</p>
                  <p>{formatDateTime(ticket.picked_up_at)}</p>
                </div>
              )}
              {ticket.returned_at && (
                <div>
                  <p className="text-xs text-gray-500">Equipamento devolvido</p>
                  <p>{formatDateTime(ticket.returned_at)}</p>
                </div>
              )}
              {ticket.resolved_at && (
                <div>
                  <p className="text-xs text-gray-500">Resolvido em</p>
                  <p>{formatDateTime(ticket.resolved_at)}</p>
                </div>
              )}
              {ticket.closed_at && (
                <div>
                  <p className="text-xs text-gray-500">Encerrado em</p>
                  <p>{formatDateTime(ticket.closed_at)}</p>
                </div>
              )}
              {ticket.finalization_reason && (
                <div>
                  <p className="text-xs text-gray-500">Motivo de encerramento</p>
                  <p className="font-medium">{ticket.finalization_reason}</p>
                </div>
              )}
              {ticket.finalization_notes && (
                <div>
                  <p className="text-xs text-gray-500">Observações</p>
                  <p className="whitespace-pre-wrap">{ticket.finalization_notes}</p>
                </div>
              )}
              {ticket.created_at && (
                <div>
                  <p className="text-xs text-gray-500">Tempo aberto</p>
                  <p>{(() => {
                    const end = ticket.closed_at ?? ticket.resolved_at ?? new Date().toISOString();
                    const days = Math.floor((new Date(end).getTime() - new Date(ticket.created_at).getTime()) / 86400000);
                    return days === 0 ? "Menos de 1 dia" : `${days} dia${days !== 1 ? "s" : ""}`;
                  })()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {canUpdate && transitions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ações</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {transitions.map((t) => (
                  <button
                    key={t.value}
                    onClick={() =>
                      t.value === "closed"
                        ? setFinalizationOpen(true)
                        : changeStatus(t.value)
                    }
                    disabled={updatingStatus}
                    className="w-full h-9 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
                    style={{ background: STATUS_COLORS[t.value] ?? "#374151", color: "#fff" }}
                  >
                    {updatingStatus ? "Atualizando..." : t.label}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <TicketFinalizationModal
        open={finalizationOpen}
        onClose={() => setFinalizationOpen(false)}
        onConfirm={handleFinalize}
      />
    </div>
  );
}
