"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, Library, LogOut, Network, Settings } from "lucide-react";
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
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-ink">SF</span>
          <span className="font-semibold tracking-tight">SkillForge</span>
        </Link>
        {courseTitle ? (
          <div className="mb-4 rounded-xl bg-surface-2 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Active goal</p>
            <p className="truncate text-sm font-medium" title={courseTitle}>{courseTitle}</p>
          </div>
        ) : null}
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active(href) ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
            >
              <Icon size={18} aria-hidden /> {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line pt-3">
          <p className="truncate px-3 text-xs text-muted" title={email}>{email}</p>
          <form action={signOutAction}>
            <button className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink">
              <LogOut size={18} aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <nav className="sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 md:hidden" aria-label="Main">
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
