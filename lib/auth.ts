import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";

export const ADMIN_COOKIE_NAME = "stickymilk_admin_token";

export function getExpectedToken(): string {
  const secret = process.env.ADMIN_PASSWORD || "stickymilk-lab-admin";
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
