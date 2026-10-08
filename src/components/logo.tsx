import Link from "next/link";
import { cn } from "@/lib/utils";

/** Cognify mark: three connected skill nodes on a green tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-brand to-emerald-700 text-white shadow-[0_6px_16px_-6px_color-mix(in_oklab,var(--brand)_70%,transparent)] dark:to-emerald-500 dark:text-[#03140d]", className)}>
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
        <path d="M7 6.5 12 17M17 6.5 12 17M7 6.5h10" opacity=".55" />
        <circle cx="7" cy="6.5" r="2.6" fill="currentColor" stroke="none" />
        <circle cx="17" cy="6.5" r="2.6" fill="currentColor" stroke="none" />
        <circle cx="12" cy="17" r="3" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)} aria-label="Cognify home">
      <LogoMark />
      <span className="font-display text-[1.15rem] font-semibold tracking-tight">Cognify</span>
    </Link>
  );
}
