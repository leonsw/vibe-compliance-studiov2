import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 1. PROTECT DASHBOARD ROUTES
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    
    // A. Kick out unauthenticated users
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // B. Check Security Policies (Lockout & Password Reset)
    const { data: profile } = await supabase
        .from("profiles")
        .select("force_password_change, locked_until")
        .eq("id", user.id)
        .single();

    // C. Handle Locked Accounts
    if (profile?.locked_until && new Date(profile.locked_until) > new Date()) {
        // Optional: Redirect to a specific "Contact Support" page
        // For now, we redirect to login to keep them out
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const isUpdatePage = request.nextUrl.pathname === "/dashboard/update-password";

    // D. Enforce Password Change
    if (profile?.force_password_change && !isUpdatePage) {
        return NextResponse.redirect(new URL("/dashboard/update-password", request.url));
    }

    // E. Prevent Active Users from visiting the Update Page unnecessarily
    if (!profile?.force_password_change && isUpdatePage) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};