import {
  pgTable, serial, text, integer, date, timestamp, uniqueIndex, index,
} from 'drizzle-orm/pg-core';

export const clientsTable = pgTable('clients', {
  id: serial('id').primaryKey(),
  raison_sociale: text('raison_sociale').notNull(),
  ninea: text('ninea').notNull().unique(),
  adresse: text('adresse').notNull(),
  email: text('email').unique(),
  telephone: text('telephone').notNull().unique(),
  date_creation: date('date_creation').notNull().defaultNow(),
  statut: text('statut').notNull().default('actif'),
});

export const utilisateursTable = pgTable('utilisateurs', {
  id: serial('id').primaryKey(),
  nom: text('nom').notNull(),
  prenom: text('prenom').notNull(),
  email: text('email').notNull().unique(),
  mot_de_passe: text('mot_de_passe').notNull(),
  telephone: text('telephone').notNull().unique(),
  photo: text('photo').notNull().default(''),
  date_creation: date('date_creation').notNull().defaultNow(),
  role: text('role').notNull(),
  statut: text('statut').notNull().default('actif'),
  clientId: integer('client_id').references(() => clientsTable.id, { onDelete: 'set null' }),
}, (table) => [index('utilisateurs_client_id_index').on(table.clientId)]);

export const missionsTable = pgTable('missions', {
  id: serial('id').primaryKey(),
  titre: text('titre').notNull(),
  description: text('description').notNull().default(''),
  date_debut: date('date_debut').notNull(),
  date_fin_prevue: date('date_fin_prevue').notNull(),
  date_fin_reelle: date('date_fin_reelle'),
  avancement: integer('avancement').notNull().default(0),
  statut: text('statut').notNull().default('en_cours'),
  date_creation: date('date_creation').notNull().defaultNow(),
  clientId: integer('client_id').notNull().references(() => clientsTable.id),
  expertComptableId: integer('expert_comptable_id').notNull().references(() => utilisateursTable.id),
}, (table) => [
  index('missions_client_id_index').on(table.clientId),
  index('missions_expert_comptable_id_index').on(table.expertComptableId),
  index('missions_statut_index').on(table.statut),
]);

export const missionAuditeursTable = pgTable('mission_auditeurs', {
  missionId: integer('mission_id').notNull().references(() => missionsTable.id, { onDelete: 'cascade' }),
  auditeurId: integer('auditeur_id').notNull().references(() => utilisateursTable.id),
}, (table) => [
  uniqueIndex('mission_auditeur_unique').on(table.missionId, table.auditeurId),
  index('mission_auditeurs_auditeur_id_index').on(table.auditeurId),
]);

export const documentsTable = pgTable('documents', {
  id: serial('id').primaryKey(),
  titre: text('titre').notNull(),
  nom_fichier: text('nom_fichier').notNull(),
  chemin: text('chemin').notNull(),
  description: text('description').notNull().default(''),
  date_upload: date('date_upload').notNull().defaultNow(),
  taille: integer('taille'),
  missionId: integer('mission_id').notNull().references(() => missionsTable.id, { onDelete: 'cascade' }),
  utilisateurId: integer('utilisateur_id').notNull().references(() => utilisateursTable.id),
}, (table) => [
  index('documents_mission_id_index').on(table.missionId),
  index('documents_utilisateur_id_index').on(table.utilisateurId),
]);

export const journauxActivitesTable = pgTable('journaux_activites', {
  id: serial('id').primaryKey(),
  action: text('action').notNull(),
  date_action: timestamp('date_action').notNull().defaultNow(),
  utilisateurId: integer('utilisateur_id').references(() => utilisateursTable.id, { onDelete: 'set null' }),
}, (table) => [index('journaux_activites_date_action_index').on(table.date_action)]);
