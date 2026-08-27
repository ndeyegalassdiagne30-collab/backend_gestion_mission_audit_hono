import bcrypt from 'bcryptjs';
import { db } from './client.js';
import { clientsTable, utilisateursTable, missionsTable, missionAuditeursTable } from './schema.js';

const existants = await db.select().from(utilisateursTable);
if (existants.length) {
  console.log('Seed ignoré : la table utilisateurs contient déjà des données.');
  process.exit(0);
}

await db.transaction(async (tx) => {
  const [sentech, africa] = await tx.insert(clientsTable).values([
    { raison_sociale: 'SENTECH SARL', ninea: 'SN123456789', adresse: 'Dakar, Sénégal', email: 'contact@sentech.sn', telephone: '771234567', statut: 'actif' },
    { raison_sociale: 'AFRICA BUSINESS', ninea: 'SN987654321', adresse: 'Thiès, Sénégal', email: 'info@africabusiness.sn', telephone: '781112233', statut: 'actif' },
  ]).returning();
  const motsDePasse = await Promise.all(['admin1123', 'expert123', 'auditeur1123', 'auditeur2123'].map((m) => bcrypt.hash(m, 10)));
  const [admin, expert, auditeur1, auditeur2] = await tx.insert(utilisateursTable).values([
    { nom: 'Diagne', prenom: 'Ndeye', email: 'admin1@gmail.com', mot_de_passe: motsDePasse[0], telephone: '770000001', role: 'administrateur' },
    { nom: 'Ndiaye', prenom: 'Fatou', email: 'expert@gmail.com', mot_de_passe: motsDePasse[1], telephone: '770000002', role: 'expert_comptable' },
    { nom: 'Diagne', prenom: 'Galass', email: 'auditeur1@gmail.com', mot_de_passe: motsDePasse[2], telephone: '770000003', role: 'auditeur' },
    { nom: 'Diagne', prenom: 'Awa', email: 'auditeur2@gmail.com', mot_de_passe: motsDePasse[3], telephone: '770000004', role: 'auditeur' },
  ]).returning();
  const [mission1, mission2] = await tx.insert(missionsTable).values([
    { titre: 'Audit financier 2026', description: 'Audit des états financiers', date_debut: '2026-07-10', date_fin_prevue: '2026-07-25', avancement: 50, statut: 'en_cours', clientId: sentech.id, expertComptableId: expert.id },
    { titre: 'Audit financier 2025', description: 'Audit des états financiers', date_debut: '2026-07-15', date_fin_prevue: '2026-08-05', avancement: 10, statut: 'en_relecture', clientId: africa.id, expertComptableId: expert.id },
  ]).returning();
  await tx.insert(missionAuditeursTable).values([
    { missionId: mission1.id, auditeurId: auditeur1.id }, { missionId: mission1.id, auditeurId: auditeur2.id },
    { missionId: mission2.id, auditeurId: auditeur2.id },
  ]);
  void admin;
});
console.log('Données de démonstration AuditFlow insérées.');
process.exit(0);
