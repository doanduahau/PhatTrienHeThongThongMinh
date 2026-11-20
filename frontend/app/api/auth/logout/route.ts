import { NextResponse } from "next/server";
import { clearCookie } from "@/lib/server-auth";

export async function POST() {
  return clearCookie(NextResponse.json({ ok: true }));
}
