"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";
import { Brand, Icon } from "@/components/icons";
import { Button, LoadingScreen } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" as const },
  { href: "/pacientes", label: "Pacientes", icon: "users" as const },
];

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    async function validateSession() {
      if (!getToken()) {
        router.replace("/");
        return;
      }
      try {
        const { data } = await api.get<AuthUser>("/auth/me");
        if (active) setUser(data);
      } catch {
        if (active) {
          clearToken();
          router.replace("/");
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    void validateSession();
    return () => { active = false; };
  }, [pathname, router]);

  function logout() {
    clearToken();
    router.replace("/");
  }

  if (checking || !user) return <LoadingScreen />;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="hidden w-48 shrink-0 flex-col border-r bg-sidebar lg:flex xl:w-52">
        <div className="flex h-13 items-center border-b px-4"><Brand /></div>
        <nav aria-label="Navegación principal" className="flex-1 space-y-1.5 p-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Icon name={item.icon} className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <Icon name="logout" className="size-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-13 shrink-0 items-center justify-between border-b bg-card px-3 sm:px-4">
          <div className="lg:hidden"><Brand compact /></div>
          <nav aria-label="Navegación móvil" className="flex items-center gap-1 lg:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`grid size-10 place-items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${pathname === item.href ? "bg-accent text-primary" : "text-muted-foreground"}`}
              >
                <Icon name={item.icon} className="size-5" />
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <ThemeToggle />
            <button aria-label="Notificaciones" className="relative hidden size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted sm:grid">
              <Icon name="bell" className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" />
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{user.nombre}</p>
              <p className="text-xs text-muted-foreground">{user.usuario}</p>
            </div>
            <span className="grid size-8 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <Icon name="user" className="size-4" />
            </span>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Cerrar sesión" className="lg:hidden">
              <Icon name="logout" className="size-5" />
            </Button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
