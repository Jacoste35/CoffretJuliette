'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Supabase côté navigateur. N'utilise que des clés publiques : toute
 * lecture reste soumise à Row Level Security.
 */
export function supabaseNavigateur() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !cle) {
    throw new Error(
      'Configuration Supabase absente : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requises.',
    );
  }
  return createBrowserClient(url, cle);
}
