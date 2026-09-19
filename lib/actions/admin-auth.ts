"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, getExpectedToken } from "@/lib/auth";

export interface LoginActionState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const password = formData.get("password")?.toString() ?? "";
  const next = formData.get("next")?.toString() || "/";
  const expectedPassword = process.env.ADMIN_PASSWORD || "stickymilk-lab-admin";

  if (!password || password !== expectedPassword) {
    return { error: "Invalid admin authorization key. Access denied." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, getExpectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect(next);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  redirect("/");
}
