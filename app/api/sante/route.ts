import { NextResponse } from 'next/server';
import { etatConfiguration } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Sonde de santé. Elle ne se connecte à rien : elle dit seulement quels
 * services sont configurés, pour diagnostiquer un déploiement sans avoir à
 * lire les variables d'environnement dans l'interface de Vercel.
 */
export function GET() {
  return NextResponse.json({
    statut: 'ok',
    horodatage: new Date().toISOString(),
    configuration: etatConfiguration(),
  });
}
