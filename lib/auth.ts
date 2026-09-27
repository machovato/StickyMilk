import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";

export const ADMIN_COOKIE_NAME = "stickymilk_admin_token";

const DEV_FALLBACK_PASSWORD = "stickymilk-lab-admin";

/**
 * The admin password. The hardcoded fallback is for local dev only — in
 * production an unset ADMIN_PASSWORD would mean anyone who reads the repo
 * can log in, so fail loudly instead.
 */
export function getAdminPassword(): string {
  const configured = process.env.ADMIN_PASSWORD;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_PASSWORD must be set in production");
  }
  return DEV_FALLBACK_PASSWORD;
}

export function getExpectedToken(): string {
  const secret = getAdminPassword();
  return crypto
    .createHmac("sha256", secret)
    .update("stickymilk-admin-session-v1")
    .digest("hex");
}

/**
 * Checks if the current visitor has an authenticated admin session.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return token === getExpectedToken();
}
