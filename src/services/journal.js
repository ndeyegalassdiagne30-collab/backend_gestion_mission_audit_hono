import { desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { journauxActivitesTable } from '../db/schema.js';

export const lister = () => db.select().from(journauxActivitesTable).orderBy(desc(journauxActivitesTable.date_action));
export async function enregistrer(action, utilisateurId) {
  const [item] = await db.insert(journauxActivitesTable).values({ action, utilisateurId }).returning();
  return item;
}
