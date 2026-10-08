import { useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Cognify mark: an open "C" (cognition) whose ends connect to a lime node, the
// next skill it reaches for. The same drawing is used for the favicon
// (src/app/icon.svg) and the app icons in public/brand/.
const ARC = "M30.2 16.5A11.5 11.5 0 1 0 30.2 31.5";
const LINKS = "M30.2 16.5 35.4 24 30.2 31.5";

/** The full-colour app tile. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" className={cn("sf-logo h-8 w-8 shrink-0 drop-shadow-[0_6px_14px_rgb(5_96_63/0.28)]", className)} role="img" aria-hidden>
      <defs>
        <linearGradient id={`${id}t`} x1="6" y1="2" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#14b87a" />
          <stop offset="1" stopColor="#05603f" />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${id}t)`} />
      <rect width="48" height="48" rx="13" fill={`url(#${id}s)`} />
      <path d={ARC} fill="none" stroke="#fff" strokeWidth="5.4" strokeLinecap="round" />
      <path d={LINKS} fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="sf-spark" cx="35.4" cy="24" r="4.1" fill="#bef264" />
    </svg>
  );
}

/** The glyph alone (arc and node, no links) in currentColor, for use on coloured backgrounds and as a watermark. */
export function LogoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="8 8 32 32" className={cn("h-8 w-8", className)} fill="none" stroke="currentColor" aria-hidden>
      <path d={ARC} strokeWidth="5.4" strokeLinecap="round" />
      <circle cx="35.4" cy="24" r="4.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Mark plus wordmark. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[1.2rem] font-semibold tracking-[-0.02em]", className)}>
      Cogn<span className="text-brand">i</span>fy
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)} aria-label="Cognify home">
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      <Wordmark />
    </Link>
  );
}
