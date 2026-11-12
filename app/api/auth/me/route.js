import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";

export async function GET(req) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({
    user: {
      id: auth.sub,
      name: auth.name,
      email: auth.email,
      role: auth.role,
    },
  });
}
