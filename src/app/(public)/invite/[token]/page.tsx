import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createInvitationService } from "@/lib/services/invitation.service";
import { InviteClient } from "./invite-client";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const admin = createSupabaseAdminClient();
  const service = createInvitationService(admin);
  const invite = await service.getByToken(token);

  if (!invite) return notFound();

  if (invite.accepted_at) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg text-center">
          <h1 className="text-xl font-bold text-gray-900">Convite já utilizado</h1>
          <p className="mt-2 text-sm text-gray-500">Este convite já foi aceito anteriormente.</p>
          <a href="/login" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Ir para o login</a>
        </div>
      </div>
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg text-center">
          <h1 className="text-xl font-bold text-gray-900">Convite expirado</h1>
          <p className="mt-2 text-sm text-gray-500">Peça ao administrador para enviar um novo convite.</p>
        </div>
      </div>
    );
  }

  return (
    <InviteClient
      token={token}
      email={invite.email}
      companyName={invite.company?.name ?? "BSM"}
    />
  );
}
