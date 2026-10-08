import * as React from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "flex w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-[var(--shadow)] outline-none transition-[color,box-shadow,border-color] placeholder:text-muted/80 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(inputClass, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(inputClass, "min-h-20", className)} {...props} />;
}
