import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const authRoutes = ["/login", "/verify", "/onboard"];
  const isAuthRoute = authRoutes.some(r => pathname.startsWith(r));

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthRoute && pathname !== "/onboard") {
    const { data } = await supabase.from("profiles")
      .select("name").eq("id", user.id).single();
    const profile = data as { name: string } | null;
    if (!profile?.name) return NextResponse.redirect(new URL("/onboard", request.url));
    return NextResponse.redirect(new URL("/bills", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-.*).*)",
  ],
};
