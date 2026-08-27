import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { documentsTable } from '../db/schema.js';

export function lister({ missionId } = {}) {
  const requete = db.select().from(documentsTable);
  if (missionId === undefined) return requete;
  return requete.where(eq(documentsTable.missionId, missionId));
}
export async function trouver(id) {
     const [item] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
      return item; }
export async function creer(data) {
     const [item] = await db.insert(documentsTable).values(data).returning(); 
     return item; }
export async function supprimer(id) {
     const [item] = await db.delete(documentsTable).where(eq(documentsTable.id, id)).returning(); 
     return item; }
