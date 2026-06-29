/**
 * Passcode storage backed by Firebase Firestore.
 *
 * Behavior:
 * - One document at `app_settings/main` holds a SHA-256 hex digest of the passcode.
 * - First boot: if no document exists, fall back to `process.env.APP_PASSCODE`
 *   so the user can sign in immediately. They can then change it from Settings.
 * - After the user changes the passcode, the env value is no longer consulted.
 */

import { db } from "@/lib/firestore";
import { nowIso } from "@/lib/format";
import { safeEqual, sha256Hex } from "@/lib/auth";

const SETTINGS_DOC = "main";

async function getStored(): Promise<string | null> {
  const snap = await db().collection("app_settings").doc(SETTINGS_DOC).get();
  if (!snap.exists) return null;
  const data = snap.data() as { passcode_hash?: string } | undefined;
  return data?.passcode_hash ?? null;
}

/** True if the submitted passcode matches the stored hash, or env on first run. */
export async function verifyPasscode(submitted: string): Promise<boolean> {
  if (!submitted) return false;
  const stored = await getStored();
  if (stored) {
    const got = await sha256Hex(submitted);
    return safeEqual(got, stored);
  }
  // Bootstrap path: no doc yet, accept env passcode if configured.
  const envPasscode = process.env.APP_PASSCODE;
  if (!envPasscode) return false;
  return safeEqual(submitted, envPasscode);
}

/** Replace the passcode. Caller must verify the current one first. */
export async function setPasscode(next: string): Promise<void> {
  const hash = await sha256Hex(next);
  await db()
    .collection("app_settings")
    .doc(SETTINGS_DOC)
    .set({ passcode_hash: hash, updated_at: nowIso() }, { merge: true });
}

/** True once the user has set their own passcode (no longer relying on env). */
export async function passcodeIsCustom(): Promise<boolean> {
  return (await getStored()) !== null;
}
