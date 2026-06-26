"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/ticket-status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils/format";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
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
  canAssign: boolean;
  currentUserId: string;
}

export function TicketDetailClient({ ticket, canUpdate, canAssign, currentUserId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(ticket.status);
  const [comments, setComments] = useState<TicketComment[]>(ticket.comments ?? []);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transitions = VALID_TRANSITIONS[status] ?? [];

  const changeStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
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
      setComments((prev) => [...prev, data]);
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

          <Card>
            <CardHeader>
              <CardTitle>Comentários ({comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar name={comment.user?.name ?? "?"} src={comment.user?.avatar_url} size="sm" />
                  <div className="flex-1 rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{comment.user?.name}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(comment.created_at)}</p>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-gray-400">Nenhum comentário ainda</p>
              )}

              {canUpdate && (
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
                  <Link href={`/equipment/${ticket.equipment.id}`} className="font-medium text-[var(--brand-primary)] hover:underline">
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
                    onClick={() => changeStatus(t.value)}
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
    </div>
  );
}
