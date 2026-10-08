/**
 * The project URL from NEXT_PUBLIC_SUPABASE_URL, reduced to its origin.
 * The dashboard also shows endpoint URLs such as https://<ref>.supabase.co/rest/v1/;
 * pasting one of those makes every Auth call fail with "Invalid path specified in request URL".
 */
export function supabaseUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, "");
  }
}
