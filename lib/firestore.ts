/**
 * Firebase Firestore client for server-side use (API routes).
 *
 * Why firebase-admin: Vercel functions run server-side Node, and the Admin
 * SDK lets us bypass Firestore security rules for our trusted backend. The
 * client-side never touches Firestore directly — everything goes through
 * /api/* routes that are guarded by the passcode middleware.
 *
 * Env vars expected on Vercel & locally (.env.local):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (literal newlines OR "\n" escape sequences both work)
 *
 * Get these by creating a Firebase service account in the Firebase console:
 *   Project Settings → Service accounts → Generate new private key.
 */

import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cachedDb: Firestore | null = null;

function getApp(): App {
  // Reuse if any app is already initialized (Next.js hot-reload safety).
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase admin env vars missing: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.",
    );
  }
  // The private key can arrive shaped a few different ways depending on how
  // it was pasted/uploaded:
  //   1. with real newlines (local .env.local, vercel-cli stdin pipe)
  //   2. with `\n` escape sequences (Vercel dashboard, GitHub secrets)
  //   3. wrapped in surrounding double-quotes (when copied straight out of
  //      the JSON service-account file)
  // Normalize all three so node:crypto's PEM parser doesn't choke.
  privateKey = privateKey.trim();
  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1);
  }
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

/** Lazily initialized Firestore instance. */
export function db(): Firestore {
  if (cachedDb) return cachedDb;
  cachedDb = getFirestore(getApp());
  return cachedDb;
}

/** Generate a stable id without external deps. Base36 of 16 random bytes. */
export function newId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  return n.toString(36);
}
