/**
 * _auth.ts — shared auth helpers for JWT, cookies, users, magic links.
 * Uses jose for JWT (edge-compatible), Firestore REST for persistence.
 */

import { SignJWT, jwtVerify } from 'jose';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  setDocument,
  getDocument,
  updateDocument,
  queryDocuments,
} from './alerts/_firebase.js';

// ── Config (lazy, read at call time) ─────────────────────────────────────────

function jwtSecret() {
  return new TextEncoder().encode(process.env.AUTH_JWT_SECRET || 'dev-secret-change-me');
}

const COOKIE_NAME = 'edge_session';

// ── JWT ──────────────────────────────────────────────────────────────────────

export async function signJwt(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(jwtSecret());
}

export async function verifyJwt(token: string): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    return { email: payload.email as string };
  } catch {
    return null;
  }
}

// ── Cookie ───────────────────────────────────────────────────────────────────

export function setSessionCookie(res: VercelResponse, jwt: string): void {
  const maxAge = 30 * 24 * 60 * 60; // 30 days
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${jwt}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`,
  );
}

export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
  );
}

export async function getSessionEmail(req: VercelRequest): Promise<string | null> {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  const payload = await verifyJwt(match[1]);
  return payload?.email ?? null;
}

// ── User types ───────────────────────────────────────────────────────────────

export interface UserDoc {
  id: string;
  email: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  vipActive: boolean;
  vipPlan: string | null;
  vipCurrentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Firestore: users ─────────────────────────────────────────────────────────

export async function getUserByEmail(email: string): Promise<UserDoc | null> {
  const docs = await queryDocuments('users', [
    { field: 'email', op: 'EQUAL', value: email },
  ]);
  if (docs.length === 0) return null;
  return docs[0] as unknown as UserDoc;
}

export async function getOrCreateUser(email: string): Promise<UserDoc> {
  const existing = await getUserByEmail(email);
  if (existing) return existing;

  const now = new Date().toISOString();
  const data = {
    email,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    vipActive: false,
    vipPlan: null,
    vipCurrentPeriodEnd: null,
    createdAt: now,
    updatedAt: now,
  };

  // Use email-derived ID for deterministic lookups
  const docId = emailToDocId(email);
  await setDocument('users', docId, data);
  return { id: docId, ...data };
}

export async function updateUserByEmail(
  email: string,
  data: Record<string, unknown>,
): Promise<void> {
  const user = await getUserByEmail(email);
  if (!user) return;
  await updateDocument('users', user.id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

function emailToDocId(email: string): string {
  // Simple deterministic ID from email (replace unsafe chars)
  return email.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// ── Firestore: magic_links ───────────────────────────────────────────────────

export async function createMagicLink(email: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  await setDocument('magic_links', token, {
    email,
    expiresAt,
    consumedAt: null,
  });

  return token;
}

export async function validateAndConsumeMagicLink(
  token: string,
): Promise<string | null> {
  const doc = await getDocument('magic_links', token);
  if (!doc) return null;

  // Already consumed?
  if (doc.consumedAt) return null;

  // Expired?
  const expiresAt = new Date(doc.expiresAt as string);
  if (expiresAt < new Date()) return null;

  // Mark consumed
  await updateDocument('magic_links', token, {
    consumedAt: new Date().toISOString(),
  });

  return doc.email as string;
}

// ── Email (Resend) ───────────────────────────────────────────────────────────

export async function sendMagicLinkEmail(
  email: string,
  token: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[auth] RESEND_API_KEY not set — magic link token: ${token}`);
    return;
  }

  const baseUrl = process.env.AUTH_BASE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  const link = `${baseUrl}/api/auth?token=${token}`;
  const from = process.env.EMAIL_FROM || 'NBA Edge Detector <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Your Edge Detector sign-in link',
      html: [
        '<div style="font-family:sans-serif;max-width:480px;margin:0 auto">',
        '<h2>Sign in to NBA Edge Detector</h2>',
        `<p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">Sign In</a></p>`,
        '<p style="color:#666;font-size:14px">This link expires in 15 minutes. If you didn\'t request this, ignore this email.</p>',
        '</div>',
      ].join(''),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[auth] Resend error ${res.status}: ${text.slice(0, 200)}`);
  }
}
