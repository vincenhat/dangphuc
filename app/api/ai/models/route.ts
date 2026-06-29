import { NextResponse } from "next/server";
import { availableModels, getModel } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ai/models
 * Returns the models whose provider API key is configured, plus the default
 * id. The client uses this to populate the model switcher — models without a
 * key are never offered, so the user can't pick something that will 401.
 */
export async function GET() {
  const models = availableModels().map((m) => ({
    id: m.id,
    label: m.label,
    provider: m.provider,
    note: m.note ?? "",
  }));
  return NextResponse.json({ models, default: getModel() });
}
