import { z } from 'zod';

/**
 * Les variables d'environnement sont validées à l'usage, jamais au chargement
 * du module : le site doit pouvoir se construire et se déployer avant que
 * Supabase ou Stripe ne soient configurés.
 */

const schemaBaseDeDonnees = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL est absente')
    .refine((v) => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
      message: 'DATABASE_URL doit être une URL PostgreSQL',
    }),
});

const schemaSupabase = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL doit être une URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export function envBaseDeDonnees() {
  const r = schemaBaseDeDonnees.safeParse(process.env);
  if (!r.success) {
    throw new Error(
      `Configuration de la base de données incomplète : ${r.error.issues
        .map((i) => i.message)
        .join(', ')}`,
    );
  }
  return r.data;
}

export function envSupabase() {
  const r = schemaSupabase.safeParse(process.env);
  if (!r.success) {
    throw new Error(
      `Configuration Supabase incomplète : ${r.error.issues.map((i) => i.message).join(', ')}`,
    );
  }
  return r.data;
}

/** Ce qui est configuré, sans jamais exposer la moindre valeur. */
export function etatConfiguration() {
  return {
    baseDeDonnees: schemaBaseDeDonnees.safeParse(process.env).success,
    supabase: schemaSupabase.safeParse(process.env).success,
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    email: Boolean(process.env.RESEND_API_KEY),
  };
}
