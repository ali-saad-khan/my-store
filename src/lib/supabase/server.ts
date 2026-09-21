import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * Reads/writes the session via Next.js cookies so `@supabase/ssr` can keep it fresh.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component with no response to attach cookies to;
          // safe to ignore because src/middleware.ts refreshes the session on every request.
        }
      },
    },
  });
}
