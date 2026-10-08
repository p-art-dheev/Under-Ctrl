// Authentication. Supabase Auth when configured; otherwise a clearly labeled
// local demo login (scrypt password hashes, HMAC-signed session cookie) so the
// app can be run end to end without accounts. The local mode is for demos on
// one machine only.

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { supabaseUrl } from "@/lib/supabase-url";
import { appEnv } from "@/lib/env";
import { dataMode, localStore, supabaseStore, withLocalDb, type Store } from "@/lib/db/store";

export interface SessionUser {
  id: string;
  email: string;
}

export async function supabaseServer() {
  const jar = await cookies();
  return createServerClient(supabaseUrl()!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {
          // called from a Server Component: the proxy refreshes the session instead
        }
      },
    },
  });
}

// ------------------------------------------------------------------ local demo auth
export const LOCAL_COOKIE = "sf_local_session";
const SESSION_DAYS = 14;

async function localSecret(): Promise<string> {
  if (process.env.LOCAL_SESSION_SECRET) return process.env.LOCAL_SESSION_SECRET;
  const dir = appEnv("DATA_DIR") || path.join(process.cwd(), ".data");
  const file = path.join(dir, "session-secret");
  try {
    return (await fs.readFile(file, "utf8")).trim();
  } catch {
    await fs.mkdir(dir, { recursive: true });
    const secret = randomBytes(32).toString("hex");
    await fs.writeFile(file, secret, { flag: "wx" }).catch(() => undefined);
    return (await fs.readFile(file, "utf8")).trim();
  }
}

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

async function readLocalSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(LOCAL_COOKIE)?.value;
  if (!token) return null;
  const [id, exp, mac] = token.split(".");
  if (!id || !exp || !mac || Number(exp) < Date.now()) return null;
  const expected = sign(`${id}.${exp}`, await localSecret());
  if (expected.length !== mac.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(mac))) return null;
  const user = await withLocalDb((db) => db.users.find((u) => u.id === id));
  return user ? { id: user.id, email: user.email } : null;
}

async function setLocalSession(userId: string) {
  const exp = String(Date.now() + SESSION_DAYS * 86400_000);
  const token = `${userId}.${exp}.${sign(`${userId}.${exp}`, await localSecret())}`;
  (await cookies()).set(LOCAL_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && appEnv("INSECURE_COOKIE") !== "1",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

const hashPassword = (password: string, salt: string) => scryptSync(password, salt, 32).toString("hex");

// ------------------------------------------------------------------ public API
export async function currentUser(): Promise<SessionUser | null> {
  if (dataMode() === "local") return readLocalSession();
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
}

/** For pages and actions that need a signed-in learner. */
export async function requireUser(): Promise<{ user: SessionUser; store: Store }> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return { user, store: await storeFor(user) };
}

export async function storeFor(user: SessionUser): Promise<Store> {
  return dataMode() === "local" ? localStore(user.id) : supabaseStore(await supabaseServer(), user.id);
}

export type AuthResult = { ok: true; needsConfirmation?: boolean } | { ok: false; error: string };

export async function signUp(email: string, password: string, origin: string): Promise<AuthResult> {
  if (dataMode() === "local") {
    const id = crypto.randomUUID();
    const salt = randomBytes(16).toString("hex");
    const created = await withLocalDb((db) => {
      if (db.users.some((u) => u.email === email)) return false;
      db.users.push({ id, email, salt, hash: hashPassword(password, salt), created_at: new Date().toISOString() });
      return true;
    }, true);
    if (!created) return { ok: false, error: "An account with that email already exists." };
    await setLocalSession(id);
    return { ok: true };
  }
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (dataMode() === "local") {
    const user = await withLocalDb((db) => db.users.find((u) => u.email === email));
    const ok =
      user &&
      timingSafeEqual(Buffer.from(hashPassword(password, user.salt), "hex"), Buffer.from(user.hash, "hex"));
    if (!user || !ok) return { ok: false, error: "Email or password is incorrect." };
    await setLocalSession(user.id);
    return { ok: true };
  }
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      ok: false,
      error: /confirm/i.test(error.message)
        ? "Please confirm your email first: open the link we sent you."
        : error.message,
    };
  }
  return { ok: true };
}

export async function signOut() {
  if (dataMode() === "local") {
    (await cookies()).delete(LOCAL_COOKIE);
    return;
  }
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
}
