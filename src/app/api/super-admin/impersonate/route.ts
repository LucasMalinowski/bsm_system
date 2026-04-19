import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";
import { IMPERSONATE_COOKIE } from "@/lib/auth/get-session";
import { z } from "zod";

const schema = z.object({ company_id: z.string().uuid() });

export async function POST(request: NextRequest) {
  const user = await getServerSession();
  if (!user) return unauthorizedResponse();
  if (user.role !== "super_admin") return forbiddenResponse();

  const body = await request.json();
  const { company_id } = schema.parse(body);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(IMPERSONATE_COOKIE, company_id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return response;
}
