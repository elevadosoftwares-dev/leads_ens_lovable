import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Building2, BookMarked, Users, LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { signOut as signOutFn } from "@/lib/auth.functions";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/companies", label: "Company", icon: Building2 },
  { to: "/certifications", label: "Certifications", icon: BookMarked },
  { to: "/users", label: "Manage User", icon: Users },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOutFn();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          "bg-[image:var(--gradient-sidebar)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-5">
          <div>
            <p className="text-xl font-extrabold tracking-[0.18em] text-sidebar-primary">ENS</p>
            <p className="text-[0.65rem] tracking-wide text-sidebar-foreground/70">
              Expiry Notification System
            </p>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold uppercase tracking-wide transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="truncate text-sm font-semibold">{session?.fullName || session?.email}</p>
          <p className="text-xs uppercase tracking-wide text-sidebar-foreground/60">
            {session?.role === "admin" ? "Administrator" : "Standard user"}
          </p>
          <button
            onClick={signOut}
            className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-6" />
          </button>
          <span className="font-extrabold tracking-[0.18em] text-primary">ENS</span>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
