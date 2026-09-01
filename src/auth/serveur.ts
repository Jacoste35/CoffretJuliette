import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { envSupabase } from '@/lib/env';

/**
 * Client Supabase côté serveur. La clé de service ne transite jamais par ici :
 * seule la clé publique est utilisée, et Row Level Security fait le reste.
 * Un client ne doit pouvoir lire que ses propres devis et commandes.
 */
export async function supabaseServeur() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = envSupabase();
  const magasin = await cookies();

  return createServerClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => magasin.getAll(),
      setAll: (aPoser) => {
        try {
          for (const { name, value, options } of aPoser) magasin.set(name, value, options);
        } catch {
          // Appelé depuis un Server Component : la session est rafraîchie par
          // le middleware, il n'y a rien à faire ici.
        }
      },
    },
  });
}

/** L'utilisateur connecté, ou null. Ne lève jamais : un visiteur est légitime. */
export async function utilisateurCourant() {
  try {
    const { data } = await (await supabaseServeur()).auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}
