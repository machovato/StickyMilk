"use client";

import { useActionState } from "react";
import { Lock, ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { loginAction } from "@/lib/actions/admin-auth";

export function AdminLoginForm({ next = "/" }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#1a130e]/20 shadow-md p-6 sm:p-8 flex flex-col gap-6 text-left">
        <div className="flex items-center justify-between border-b border-[#1a130e]/10 pb-3">
          <div className="flex items-center gap-2">
            <Lock size={20} weight="bold" className="text-[#001ec0]" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#1a130e]">
              ADMIN LOGIN
            </span>
          </div>
          <Link
            href="/"
            className="font-mono text-[11px] text-[#7f756f] hover:text-[#1a130e] flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            <span>Cancel</span>
          </Link>
        </div>

        <div>
          <h1 className="font-syne text-2xl font-bold text-[#1a130e]">
            Admin Access
          </h1>
          <p className="font-body text-xs sm:text-sm text-[#4d4540] mt-1 leading-relaxed">
            Enter your admin authorization key to create and edit recipes.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="font-mono text-[11px] font-bold uppercase text-[#1a130e] tracking-wider"
            >
              Authorization Key
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 bg-[#fef8f4] border border-[#1a130e]/20 font-mono text-sm text-[#1a130e] placeholder:text-[#7f756f] focus:outline-none focus:border-[#001ec0] focus:ring-1 focus:ring-[#001ec0]"
            />
          </div>

          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs font-mono font-medium">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 bg-[#1a130e] hover:bg-[#001ec0] text-white font-mono text-xs uppercase font-bold tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-[0_2px_0_#1a130e]"
          >
            {pending ? "Verifying..." : "Sign In →"}
          </button>
        </form>
      </div>
    </div>
  );
}
