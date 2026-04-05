import { createBrowserClient } from "@supabase/ssr";

// Typed client — replace Database with generated types after running:
//   npx supabase gen types typescript --project-id <ref> > lib/types/database.ts
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
