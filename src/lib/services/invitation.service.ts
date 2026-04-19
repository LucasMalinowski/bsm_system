import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types";

export interface Invitation {
  id: string;
  company_id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  company?: { name: string; primary_color: string; logo_url: string | null };
  inviter?: { name: string } | null;
}

export interface CreateInvitationInput {
  email: string;
  role: UserRole;
  company_id: string;
  invited_by: string;
  /** App origin used as redirectTo in the Supabase invite email */
  appBaseUrl: string;
}

export class InvitationService {
  constructor(private supabase: SupabaseClient) {}

  /** Creates the DB record and sends the invite email via Supabase (uses your configured SMTP). */
  async create(input: CreateInvitationInput): Promise<Invitation> {
    const admin = createSupabaseAdminClient();

    // Reuse a still-valid invitation for the same email + company
    const { data: existing } = await this.supabase
      .from("invitations")
      .select("*, company:companies(name,primary_color,logo_url), inviter:profiles!invitations_invited_by_fkey(name)")
      .eq("email", input.email)
      .eq("company_id", input.company_id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    const invitation = existing
      ? (existing as Invitation)
      : await (async () => {
          const { data, error } = await this.supabase
            .from("invitations")
            .insert({ email: input.email, role: input.role, company_id: input.company_id, invited_by: input.invited_by })
            .select("*, company:companies(name,primary_color,logo_url), inviter:profiles!invitations_invited_by_fkey(name)")
            .single();
          if (error) throw new Error(error.message);
          return data as Invitation;
        })();

    // Send invite email via Supabase (uses SMTP configured in your Supabase project settings)
    const redirectTo = `${input.appBaseUrl}/invite/${invitation.token}`;
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(input.email, { redirectTo });

    // ALREADY_REGISTERED means the user exists — we still created the DB record, just skip the email
    if (inviteErr && !inviteErr.message.includes("already been registered")) {
      throw new Error(`Failed to send invite email: ${inviteErr.message}`);
    }

    return invitation;
  }

  /** Reads an invitation by token. Uses admin client so it works unauthenticated. */
  async getByToken(token: string): Promise<Invitation | null> {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("invitations")
      .select("*, company:companies(name,primary_color,logo_url), inviter:profiles!invitations_invited_by_fkey(name)")
      .eq("token", token)
      .maybeSingle();
    return (data as Invitation | null) ?? null;
  }

  /**
   * Completes an accepted invitation for an already-authenticated user.
   * Updates their profile (name, avatar, company_id, role) and marks the invite used.
   */
  async complete(
    token: string,
    userId: string,
    firstName: string,
    lastName: string,
    avatarFile?: File
  ): Promise<void> {
    const admin = createSupabaseAdminClient();

    const invite = await this.getByToken(token);
    if (!invite) throw new Error("Convite não encontrado");
    if (invite.accepted_at) throw new Error("Convite já utilizado");
    if (new Date(invite.expires_at) < new Date()) throw new Error("Convite expirado");

    const name = `${firstName} ${lastName}`.trim();
    let avatarUrl: string | null = null;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const path = `${invite.company_id}/${userId}.${ext}`;
      const { error: upErr } = await admin.storage
        .from("avatars")
        .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });

      if (!upErr) {
        const { data: urlData } = admin.storage.from("avatars").getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }
    }

    // Update profile: set name, company, role, avatar
    await admin
      .from("profiles")
      .update({ name, company_id: invite.company_id, role: invite.role, avatar_url: avatarUrl })
      .eq("id", userId);

    // Mark accepted
    await admin.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("token", token);
  }

  async listByCompany(companyId: string): Promise<Invitation[]> {
    const { data, error } = await this.supabase
      .from("invitations")
      .select("*, inviter:profiles!invitations_invited_by_fkey(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Invitation[];
  }
}

export function createInvitationService(supabase: SupabaseClient) {
  return new InvitationService(supabase);
}
