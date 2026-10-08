// Refreshes the Supabase session cookie and keeps signed-out visitors out of
// the app. Pages still verify the user server-side (requireUser).
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseUrl } from "@/lib/supabase-url";

const PUBLIC = ["/", "/login", "/signup", "/check-email", "/auth"];
const isPublic = (p: string) => PUBLIC.some((x) => p === x || (x !== "/" && p.startsWith(`${x}/`)));

export async function proxy(request: NextRequest) {
  const url = supabaseUrl();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseMode = Boolean(url && anon && process.env.SUPABASE_SERVICE_ROLE_KEY);
  let response = NextResponse.next({ request });
  let signedIn: boolean;

  if (supabaseMode) {
    const supabase = createServerClient(url!, anon!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  } else {
    signedIn = request.cookies.has("sf_local_session");
  }

  const { pathname } = request.nextUrl;
  if (!signedIn && !isPublic(pathname)) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
