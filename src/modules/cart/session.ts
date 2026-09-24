import "server-only";
import { cookies } from "next/headers";

export const CART_SESSION_COOKIE = "cart_session";

const CART_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Read-only lookup — safe to call from Server Components. Never creates a cookie. */
export async function getCartSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_SESSION_COOKIE)?.value ?? null;
}

/** Only call from a Server Action or Route Handler — creates the cookie if missing. */
export async function getOrCreateCartSessionToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_SESSION_COOKIE)?.value;
  if (existing) return existing;

  const token = crypto.randomUUID();
  store.set(CART_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_SESSION_COOKIE_MAX_AGE,
    path: "/",
  });
  return token;
}

/** Only call from a Server Action or Route Handler. */
export async function clearCartSessionCookie() {
  const store = await cookies();
  store.delete(CART_SESSION_COOKIE);
}
