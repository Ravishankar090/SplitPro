import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
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

  // Public routes — always accessible
  if (pathname.startsWith("/login") || pathname.startsWith("/verify")) {
    return supabaseResponse;
  }

  // Not logged in — send to login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Logged in but hasn't set up profile yet — send to onboard
  if (pathname !== "/onboard") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, group_id")
      .eq("id", user.id)
      .single();

    if (!profile?.name || !profile?.group_id) {
      return NextResponse.redirect(new URL("/onboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-.*).*)",
  ],
};
