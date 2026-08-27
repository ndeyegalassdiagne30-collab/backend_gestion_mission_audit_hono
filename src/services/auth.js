import bcrypt from 'bcryptjs';
import { sign } from 'hono/jwt';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { utilisateursTable } from '../db/schema.js';
import 'dotenv/config';

const DUREE_TOKEN = 60 * 60 * 24;

export const IDENTIFIANTS_INVALIDES = 'IDENTIFIANTS_INVALIDES';

// Compare un mot de passe en clair au hash enregistré pour un utilisateur.
export function motDePasseCorrespond(utilisateur, motDePasse) {
  return bcrypt.compare(motDePasse, utilisateur.mot_de_passe);
}

export async function connecter(email, motDePasse) {
  const [utilisateur] = await db
    .select()
    .from(utilisateursTable)
    .where(eq(utilisateursTable.email, email.toLowerCase()));

  if (!utilisateur || utilisateur.statut !== 'actif') {
    throw new Error(IDENTIFIANTS_INVALIDES);
  }

  const motDePasseValide = await motDePasseCorrespond(utilisateur, motDePasse);

  if (!motDePasseValide) {
    throw new Error(IDENTIFIANTS_INVALIDES);
  }

  const maintenant = Math.floor(Date.now() / 1000);
  const payload = {
    sub: utilisateur.id,
    role: utilisateur.role,
    exp: maintenant + DUREE_TOKEN,
  };

  const token = await sign(payload, process.env.JWT_SECRET);
  const { mot_de_passe, ...utilisateurSansMotDePasse } = utilisateur;

  return {
    token,
    utilisateur: utilisateurSansMotDePasse,
  };
}
