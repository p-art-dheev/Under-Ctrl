"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, Library, LogOut, Network, Plus, Settings, Target } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Skill Map", icon: Network },
  { href: "/course", label: "My Course", icon: BookOpen },
  { href: "/resources", label: "Resources", icon: Library },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ email, courseTitle }: { email: string; courseTitle: string | null }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(`${href}/`) || (href === "/course" && path.startsWith("/learn"));
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface/80 px-3 py-5 backdrop-blur md:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-2">
          <LogoMark />
          <span className="font-display text-[1.1rem] font-semibold tracking-tight">Cognify</span>
        </Link>
        {courseTitle ? (
          <div className="mb-5 rounded-xl border border-brand/20 bg-gradient-to-br from-brand-soft to-transparent px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand"><Target size={12} aria-hidden /> Active goal</p>
            <p className="mt-0.5 truncate text-sm font-medium" title={courseTitle}>{courseTitle}</p>
          </div>
        ) : null}
        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">Learn</p>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active(href) ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              {active(href) ? <span className="absolute -left-3 top-1.5 bottom-1.5 w-1 rounded-r-full bg-brand" aria-hidden /> : null}
              <Icon size={18} aria-hidden /> {label}
            </Link>
          ))}
          <Link href="/onboarding" className="mt-3 flex items-center gap-3 rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted transition-colors hover:border-brand/50 hover:text-brand">
            <Plus size={18} aria-hidden /> New goal
          </Link>
        </nav>
        <div className="space-y-3 border-t border-line pt-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted">Theme</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-surface-2/70 px-2.5 py-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold uppercase text-brand-ink">{email.slice(0, 1)}</span>
            <p className="min-w-0 flex-1 truncate text-xs text-muted" title={email}>{email}</p>
            <form action={signOutAction}>
              <button className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink" aria-label="Sign out" title="Sign out">
                <LogOut size={16} aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <nav className="sticky top-0 z-20 flex items-center gap-1 overflow-x-auto border-b border-line bg-surface/90 px-3 py-2 backdrop-blur md:hidden" aria-label="Main">
        <LogoMark className="mr-1 h-7 w-7 shrink-0" />
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${active(href) ? "bg-brand-soft font-medium text-brand" : "text-muted"}`}
          >
            <Icon size={16} aria-hidden /> {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
