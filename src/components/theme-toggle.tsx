"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Choice = "light" | "dark";

function apply(choice: Choice) {
  document.documentElement.classList.toggle("dark", choice === "dark");
  try {
    localStorage.setItem("sf-theme", choice);
  } catch {}
}

/**
 * Switches theme with a circle that grows from the clicked button (View
 * Transitions API). Browsers without it, and visitors who prefer reduced
 * motion, get an instant switch.
 */
function reveal(choice: Choice, from: HTMLElement, commit: () => void) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduced) return commit();
  const box = from.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const transition = document.startViewTransition(() => flushSync(commit));
  transition.ready
    .then(() =>
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
      ),
    )
    .catch(() => {});
}

/** Light/dark switch. Light is the default until the learner picks dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after mount; the class is set before paint by the layout script
    setChoice(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);
  const options: { value: Choice; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light theme", icon: Sun },
    { value: "dark", label: "Dark theme", icon: Moon },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5", className)}>
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          aria-label={label}
          title={label}
          onClick={(e) => {
            if (choice === value) return;
            reveal(value, e.currentTarget, () => {
              setChoice(value);
              apply(value);
            });
          }}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:text-ink",
            choice === value && "bg-surface-2 text-ink shadow-[var(--shadow)]",
          )}
        >
          <Icon size={14} aria-hidden />
        </button>
      ))}
    </div>
  );
}
