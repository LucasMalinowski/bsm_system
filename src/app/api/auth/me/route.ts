import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { unauthorizedResponse } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  const user = await getServerSession();
  if (!user) return unauthorizedResponse();

  return NextResponse.json({ data: { user } });
}
