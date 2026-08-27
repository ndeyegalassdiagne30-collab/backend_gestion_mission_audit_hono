import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { clientsTable } from '../db/schema.js';
import { champsRenseignes } from '../utils.js';

// idsAutorises vaut null quand l'utilisateur a le droit de voir tous les clients.
export function lister(idsAutorises = null) {
  if (idsAutorises === null) return db.select().from(clientsTable);
  if (!idsAutorises.length) return Promise.resolve([]);
  return db.select().from(clientsTable).where(inArray(clientsTable.id, idsAutorises));
}
export async function trouver(id) {
     const [item] = await db.select().from(clientsTable).where(eq(clientsTable.id, id)); 
     return item; }
export async function creer(data) {
     const [item] = await db.insert(clientsTable).values(data).returning(); 
     return item; }
export async function modifier(id, data) {
     const valeurs = champsRenseignes(data);
     if (!Object.keys(valeurs).length) return trouver(id);
     const [item] = await db.update(clientsTable).set(valeurs).where(eq(clientsTable.id, id)).returning();
     return item; }
export async function supprimer(id) {
     const [item] = await db.delete(clientsTable).where(eq(clientsTable.id, id)).returning(); 
     return item; }
