"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RequireAuth, AuthButtons } from "@/components/auth/auth-ui";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="h-0.5 w-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" />
          <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-4">
              <Link href="/grid" className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" />
                <span className="text-base font-semibold tracking-tight">
                  Talking Rain TPM
                </span>
              </Link>
              <nav className="hidden items-center gap-1 md:flex">
                <NavLink href="/grid">Grid</NavLink>
                <NavLink href="/insights">Insights</NavLink>
                <NavLink href="/admin">Admin</NavLink>
                <NavLink href="/help">Help</NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <AuthButtons />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1520px] px-4 py-4">{children}</main>
      </div>
    </RequireAuth>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/grid" && pathname?.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "relative rounded-2xl px-4 py-2 text-sm font-semibold tracking-tight",
        active ? "text-slate-900" : "text-slate-600 hover:text-slate-900",
        "transition-colors"
      )}
    >
      {active ? (
        <span className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-sky-500/15 via-white to-emerald-500/15 ring-1 ring-sky-400/25" />
      ) : (
        <span className="absolute inset-0 -z-10 rounded-2xl bg-white/0 hover:bg-white/60 hover:ring-1 hover:ring-slate-200" />
      )}
      {children}
    </Link>
  );
}

