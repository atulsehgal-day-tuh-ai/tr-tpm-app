import * as React from "react";
import Link from "next/link";
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
                <span className="text-sm font-semibold tracking-tight">
                  Talking Rain TPM
                </span>
              </Link>
              <nav className="hidden items-center gap-1 md:flex">
                <NavLink href="/grid">Grid</NavLink>
                <NavLink href="/insights">Insights</NavLink>
                <NavLink href="/admin">Admin</NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden text-xs text-muted-foreground hover:text-foreground md:inline"
              >
                Login page
              </Link>
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
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground",
        "hover:bg-white/70 hover:text-foreground hover:shadow-sm",
        "border border-transparent hover:border-border/60",
        "backdrop-blur"
      )}
    >
      {children}
    </Link>
  );
}

