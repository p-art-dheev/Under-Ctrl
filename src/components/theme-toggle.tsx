"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Choice = "light" | "dark" | "system";

function apply(choice: Choice) {
  const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    if (choice === "system") localStorage.removeItem("sf-theme");
    else localStorage.setItem("sf-theme", choice);
  } catch {}
}

/** Three-way theme switch: light, system, dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("sf-theme");
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after mount; localStorage is not available during SSR
    setChoice(saved === "light" || saved === "dark" ? saved : "system");
  }, []);
  useEffect(() => {
    if (choice !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => apply("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [choice]);
  const options: { value: Choice; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light theme", icon: Sun },
    { value: "system", label: "Match system", icon: Monitor },
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
          onClick={() => {
            setChoice(value);
            apply(value);
          }}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:text-ink",
            choice === value && "bg-brand-soft text-brand",
          )}
        >
          <Icon size={14} aria-hidden />
        </button>
      ))}
    </div>
  );
}
