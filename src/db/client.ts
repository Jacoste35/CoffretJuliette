import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { envBaseDeDonnees } from '@/lib/env';
import * as schema from './schema';

/**
 * Une fonction serverless peut être instanciée des centaines de fois : sans
 * pooler, PostgreSQL sature. DATABASE_URL doit donc pointer sur le pooler
 * Supabase en mode transaction (port 6543), pas sur la connexion directe.
 *
 * En mode transaction, les requêtes préparées ne sont pas supportées :
 * d'où `prepare: false`.
 */
let connexion: ReturnType<typeof postgres> | undefined;
let instance: ReturnType<typeof creer> | undefined;

function creer() {
  const { DATABASE_URL } = envBaseDeDonnees();
  connexion = postgres(DATABASE_URL, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(connexion, { schema, casing: 'snake_case' });
}

/** Créée à la première utilisation : le site doit se construire sans base. */
export function db() {
  instance ??= creer();
  return instance;
}

export async function fermerConnexion() {
  await connexion?.end({ timeout: 5 });
  connexion = undefined;
  instance = undefined;
}

export { schema };
