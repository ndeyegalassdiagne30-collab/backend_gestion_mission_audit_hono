import { jwt } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/client.js';
import { utilisateursTable } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

const verifierJeton = jwt({ secret: process.env.JWT_SECRET || '', alg: 'HS256' });

export async function authMiddleware(c, next) {
  // Le navigateur envoie une requête OPTIONS avant certaines requêtes CORS.
  // Elle ne contient pas encore le JWT et doit être laissée au middleware CORS.
  if (c.req.method === 'OPTIONS') {
    await next();
    return;
  }

  try {
    await verifierJeton(c, async () => {});
  } catch (error) {
    if (error instanceof HTTPException && error.status === 401) {
      return c.json({ erreur: 'Token manquant, invalide ou expiré.' }, 401);
    }
    throw error;
  }
  const payload = c.get('jwtPayload');
  const [utilisateur] = await db.select().from(utilisateursTable).where(eq(utilisateursTable.id, Number(payload.sub)));
  if (!utilisateur || utilisateur.statut !== 'actif') {
    return c.json({ erreur: 'Session invalide ou compte inactif.' }, 401);
  }
  c.set('utilisateur', utilisateur);
  await next();
}

export const autoriser = (...roles) => async (c, next) => {
  if (!roles.includes(c.get('utilisateur')?.role)) {
    return c.json({ erreur: 'Vous ne disposez pas des droits nécessaires.' }, 403);
  }
  await next();
};
