import "server-only";
import { NextResponse } from "next/server";

export const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });
export const done = () => NextResponse.json({ ok: true });

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try { const b = await req.json(); return b && typeof b === "object" ? (b as Record<string, unknown>) : {}; } catch { return {}; }
}
export const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 && v.length < 100 ? v : null);
