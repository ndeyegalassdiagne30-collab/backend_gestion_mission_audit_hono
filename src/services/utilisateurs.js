import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { utilisateursTable } from '../db/schema.js';
import { champsRenseignes } from '../utils.js';

function retirerMotDePasse(utilisateur) {
  if (!utilisateur)
     return utilisateur;
  const { mot_de_passe, ...utilisateurSansMotDePasse } = utilisateur;
  return utilisateurSansMotDePasse;
}

export async function lister() {
  const liste = await db.select().from(utilisateursTable);
  return liste.map(retirerMotDePasse);
}

export async function trouver(id) {
  const [utilisateur] = await db
    .select()
    .from(utilisateursTable)
    .where(eq(utilisateursTable.id, id));

  return retirerMotDePasse(utilisateur);
}

export async function trouverComplet(id) {
  const [utilisateur] = await db
    .select()
    .from(utilisateursTable)
    .where(eq(utilisateursTable.id, id));

  return utilisateur;
}

export async function creer(data) {
  const motDePasseHache = await bcrypt.hash(data.mot_de_passe, 10);

  const [utilisateur] = await db
    .insert(utilisateursTable)
    .values({
      ...data,
      email: data.email.toLowerCase(),
      mot_de_passe: motDePasseHache,
    })
    .returning();

  return retirerMotDePasse(utilisateur);
}

export async function modifier(id, data) {
  const valeurs = champsRenseignes(data);

  if (!Object.keys(valeurs).length) {
    return trouver(id);
  }

  if (valeurs.email) {
    valeurs.email = valeurs.email.toLowerCase();
  }

  if (valeurs.mot_de_passe) {
    valeurs.mot_de_passe = await bcrypt.hash(valeurs.mot_de_passe, 10);
  }

  const [utilisateur] = await db
    .update(utilisateursTable)
    .set(valeurs)
    .where(eq(utilisateursTable.id, id))
    .returning();

  return retirerMotDePasse(utilisateur);
}

export async function supprimer(id) {
  const [utilisateur] = await db
    .delete(utilisateursTable)
    .where(eq(utilisateursTable.id, id))
    .returning();

  return retirerMotDePasse(utilisateur);
}
