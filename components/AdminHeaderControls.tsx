import Link from "next/link";
import { Plus, SignOut } from "@phosphor-icons/react/dist/ssr";
import { isAdminAuthenticated } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/admin-auth";

export async function AdminHeaderControls() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) return null;

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/recipes/new"
        className="flex items-center gap-1.5 bg-[#001ec0] hover:bg-[#1a130e] text-white px-3 sm:px-3.5 py-2 font-mono text-xs uppercase tracking-wider font-semibold transition-all shadow-[0_2px_0_#1A130E] active:translate-y-0.5"
      >
        <Plus size={16} weight="bold" />
        <span className="hidden sm:inline">New Recipe</span>
        <span className="sm:hidden">New</span>
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          title="Lock Admin Session"
          className="flex items-center gap-1 bg-[#f8f2ee] hover:bg-red-50 text-[#7f756f] hover:text-[#ba1a1a] border border-[#1a130e]/20 px-2.5 py-2 font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer"
        >
          <SignOut size={16} weight="bold" />
          <span className="hidden md:inline">Lock</span>
        </button>
      </form>
    </div>
  );
}
