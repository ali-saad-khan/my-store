import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mergeGuestCartIntoProfile } from "@/modules/cart/mutations";
import { clearCartSessionCookie, getCartSessionToken } from "@/modules/cart/session";

/**
 * Shared landing point for Supabase email links (signup confirmation and
 * password reset) — both use the PKCE code-exchange flow.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const sessionToken = await getCartSessionToken();
      if (sessionToken) {
        await mergeGuestCartIntoProfile({ profileId: data.user.id, sessionToken });
        await clearCartSessionCookie();
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could not verify link. Please try again.`);
}
