import { db } from './src/db/client.js';
import { clientsTable, utilisateursTable } from './src/db/schema.js';
import { hash } from 'bcryptjs';

export async function seed() {
  try {
    console.log('Démarrage du seed...');

  
    console.log('Création du client/cabinet initial...');
    const [nouveauClient] = await db.insert(clientsTable).values({
      raison_sociale: "Cabinet Expertise Comptable Global",
      ninea: "1234567-XYZ",
      adresse: "Dakar, Sénégal",
      email: "contact@cabinet.com",
      telephone: "770000000",
      statut: "actif"
    }).returning({ id: clientsTable.id }); 
  
    const adminPassword = await hash('admin123', 10);
   
    
    console.log('👤 Création de l\'utilisateur administrateur...');
    await db.insert(utilisateursTable).values({
      nom: "Diagne",
      prenom: "Ndeye",
      email: "admin1@gmail.com",
      mot_de_passe: adminPassword,
      telephone: "771111111",
      photo: "",
      role: "administrateur",
      statut: "actif",
      clientId: nouveauClient.id  
    });

    console.log('Seed terminé avec succès ! Cabinet et Administrateur créés.');
  } catch (error) {
    console.error('Erreur lors de l\'exécution du seed :', error);
  }
}

seed();
