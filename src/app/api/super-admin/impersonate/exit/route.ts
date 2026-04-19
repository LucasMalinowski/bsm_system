import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";
import { IMPERSONATE_COOKIE } from "@/lib/auth/get-session";

export async function POST() {
  const user = await getServerSession();
  if (!user) return unauthorizedResponse();
  if (user.role !== "super_admin") return forbiddenResponse();

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(IMPERSONATE_COOKIE);

  return response;
}
