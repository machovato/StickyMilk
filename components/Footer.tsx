import Link from "next/link";
import { CHANNEL_LABELS } from "@/lib/types";
import { isAdminAuthenticated } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/admin-auth";

const CHANNEL_ORDER = ["cometeer", "nespresso", "instant"] as const;

export async function Footer() {
  const year = new Date().getFullYear();
  const isAuth = await isAdminAuthenticated();

  return (
    <footer className="w-full bg-[#f8f2ee] mt-16 border-t border-[#1a130e]/10 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#1a130e] flex items-center justify-center">
                <span className="text-white font-syne font-bold text-base leading-none">
                  S
                </span>
              </div>
              <span className="font-syne font-bold text-xl uppercase tracking-tight text-[#1a130e]">
                STICKYMILK
              </span>
            </div>

            <p className="font-body text-xs sm:text-sm text-[#4d4540] max-w-md leading-relaxed">
              Modern coffee recipe directory designed for Cometeer, Nespresso, and specialty instant coffee drinkers. Adapt any drink to whatever you have on your counter.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <span className="font-mono text-[11px] font-bold uppercase bg-[#b8f600] text-[#141f00] px-2 py-0.5">
                v2.4 Live
              </span>
              <span className="font-mono text-[11px] uppercase text-[#4d4540]">
                Multi-Channel Coffee Hub
              </span>
            </div>
          </div>

          {/* Channels */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] font-bold uppercase text-[#4d4540] tracking-wider">
              Extraction Channels
            </span>
            <ul className="flex flex-col gap-1.5 pt-1 font-mono text-xs text-[#1d1b19]">
              <li>Cometeer Hyper-Melt</li>
              <li>Nespresso High-Bar</li>
              <li>Soluble Instant Concentrate</li>
              <li className="text-[#7f756f]">Any Counter Setup</li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] font-bold uppercase text-[#4d4540] tracking-wider">
              Navigation
            </span>
            <div className="flex flex-col gap-2 pt-1 text-sm font-mono text-xs">
              <Link
                href="/"
                className="text-[#1d1b19] hover:text-[#001ec0] transition-colors"
              >
                Recipe Archive
              </Link>
              {isAuth ? (
                <>
                  <Link
                    href="/recipes/new"
                    className="text-[#001ec0] font-bold hover:text-[#1a130e] transition-colors"
                  >
                    + New Recipe
                  </Link>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="text-[#ba1a1a] hover:underline font-mono text-xs text-left cursor-pointer"
                    >
                      Lock Admin Session
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/admin/login"
                  className="text-[#7f756f] hover:text-[#1d1b19] transition-colors"
                >
                  Admin Login
                </Link>
              )}
              <p className="text-[#7f756f] text-[11px] pt-1">
                {CHANNEL_ORDER.map((c) => CHANNEL_LABELS[c]).join(" · ")}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright ribbon */}
        <div className="mt-12 pt-6 border-t border-[#1a130e]/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-mono text-[11px] text-[#4d4540] text-center md:text-left">
            © {year} STICKYMILK. ADAPTING TRENDING COFFEE DRINKS ACROSS COMETEER, NESPRESSO &amp; INSTANT.
          </span>
          <span className="font-mono text-xs text-[#001ec0] font-bold tracking-wider">
            COMETEER // NESPRESSO // INSTANT
          </span>
        </div>
      </div>
    </footer>
  );
}
