import { NextResponse } from "next/server";
import { setPasscode, verifyPasscode } from "@/lib/passcode-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN = 4;
const MAX = 200;

export async function POST(req: Request) {
  let body: { current?: unknown; next?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";

  if (next.length < MIN || next.length > MAX) {
    return NextResponse.json(
      { error: `New passcode must be ${MIN}-${MAX} characters.` },
      { status: 400 },
    );
  }
  if (next === current) {
    return NextResponse.json(
      { error: "New passcode must be different." },
      { status: 400 },
    );
  }

  const ok = await verifyPasscode(current);
  if (!ok) {
    // Tiny delay to slow brute force on this endpoint specifically.
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: "Current passcode is incorrect." }, { status: 401 });
  }

  await setPasscode(next);
  return NextResponse.json({ ok: true });
}
