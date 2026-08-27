import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { missionsTable, missionAuditeursTable } from '../db/schema.js';
import { champsRenseignes } from '../utils.js';

async function avecAuditeurs(missions) {
  if (!missions.length) 
    return [];
  const liens = await db.select().from(missionAuditeursTable).where(inArray(missionAuditeursTable.missionId, missions.map((m) => m.id)));
  return missions.map((m) => ({ ...m, auditeurs: liens.filter((l) => l.missionId === m.id).map((l) => l.auditeurId) }));
}
export async function lister(filtres = {}) {
  const conditions = [];
  if (filtres.statut !== undefined) conditions.push(eq(missionsTable.statut, filtres.statut));
  if (filtres.clientId !== undefined) conditions.push(eq(missionsTable.clientId, filtres.clientId));
  const requete = db.select().from(missionsTable);
  return avecAuditeurs(conditions.length ? await requete.where(and(...conditions)) : await requete);
}
export async function trouver(id) {
   return (await avecAuditeurs(await db.select().from(missionsTable).where(eq(missionsTable.id, id))))[0]; }
async function remplacerAuditeurs(tx, missionId, auditeurs = []) {
  await tx.delete(missionAuditeursTable).where(eq(missionAuditeursTable.missionId, missionId));
  if (auditeurs.length) await tx.insert(missionAuditeursTable).values([...new Set(auditeurs)].map((auditeurId) => ({ missionId, auditeurId })));
}
export async function creer(data) {
  const { auditeurs = [], ...mission } = data;
  const id = await db.transaction(async (tx) => {
    const [created] = await tx.insert(missionsTable).values(mission).returning();
    await remplacerAuditeurs(tx, created.id, auditeurs);
    return created.id;
  });
  return trouver(id);
}
export async function modifier(id, data) {
  const { auditeurs, ...champs } = data;
  const mission = champsRenseignes(champs);
  await db.transaction(async (tx) => {
    if (Object.keys(mission).length) await tx.update(missionsTable).set(mission).where(eq(missionsTable.id, id));
    if (auditeurs) await remplacerAuditeurs(tx, id, auditeurs);
  });
  return trouver(id);
}
export async function affecter(id, auditeurs) {
   return modifier(id, { auditeurs }); }
export async function supprimer(id) {
  const item = await trouver(id);
  await db.delete(missionsTable).where(eq(missionsTable.id, id));
  return item;
}
