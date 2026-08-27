import { serve } from '@hono/node-server';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import 'dotenv/config';

import * as routes from './routes.js';
import * as authService from './services/auth.js';
import * as utilisateursService from './services/utilisateurs.js';
import * as clientsService from './services/clients.js';
import * as missionsService from './services/missions.js';
import * as documentsService from './services/documents.js';
import * as journalService from './services/journal.js';
import { authMiddleware, autoriser } from './middlewares/auth.js';
import { uploadFichier } from './config/cloudinary.js';
import { champsRenseignes } from './utils.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET est obligatoire.');
}

const app = new OpenAPIHono({
  defaultHook: (resultat, c) => {
    if (!resultat.success) {
      return c.json({
        erreur: 'Données invalides.',
        details: resultat.error.issues.map((probleme) => ({
          champ: probleme.path.join('.') || 'requête',
          message: probleme.message,
        })),
      }, 400);
    }
  },
});

// FRONTEND_ORIGIN accepte plusieurs origines separees par des virgules :
// l'ancien frontend (Live Server) et le frontend Vue (Vite) tournent sur des ports differents.
const originesAutorisees = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origine) => origine.trim())
  .filter(Boolean);

function originAutorisee(origine) {
  if (originesAutorisees.length === 0) {
    return origine || '*';
  }

  return originesAutorisees.includes(origine) ? origine : null;
}

app.use('*', cors({
  origin: (origine) => originAutorisee(origine),
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.options('*', (c) => {
  const origine = originAutorisee(c.req.header('Origin'));

  if (origine) {
    c.header('Access-Control-Allow-Origin', origine);
  }

  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  return c.body(null, 204);
});

// Protection des routes privées

app.use('/auth/logout', authMiddleware);
app.use('/auth/me', authMiddleware);

const cheminsProteges = [
  '/utilisateurs',
  '/clients',
  '/missions',
  '/documents',
  '/uploads',
  '/journaux_activites',
];

for (const chemin of cheminsProteges) {
  app.use(chemin, authMiddleware);
  app.use(`${chemin}/*`, authMiddleware);
}

app.use('/journaux_activites', autoriser('administrateur'));
app.use('/missions/*/auditeurs', autoriser('administrateur', 'expert_comptable'));

app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

function reponseIntrouvable(c, ressource) {
  return c.json({ erreur: `${ressource} introuvable.` }, 404);
}

function reponseInterdite(c, message = 'Accès interdit.') {
  return c.json({ erreur: message }, 403);
}

function aucunChampAModifier(c) {
  return c.json({ erreur: 'Aucun champ à modifier.' }, 400);
}

// La journalisation ne doit jamais annuler une opération déjà réussie :
// la ressource est créée ou modifiée même si l'écriture du journal échoue.
async function journaliser(action, utilisateurId) {
  try {
    await journalService.enregistrer(action, utilisateurId);
  } catch (erreur) {
    console.error("Impossible d'enregistrer l'action dans le journal :", erreur);
  }
}

async function enregistrerAction(c, action) {
  const utilisateur = c.get('utilisateur');
  await journaliser(action, utilisateur.id);
}

function missionVisiblePar(mission, utilisateur) {
  if (!mission) {
    return false;
  }

  if (utilisateur.role === 'administrateur') {
    return true;
  }

  if (utilisateur.role === 'expert_comptable') {
    return mission.expertComptableId === utilisateur.id;
  }

  if (utilisateur.role === 'auditeur') {
    return mission.auditeurs.includes(utilisateur.id);
  }

  if (utilisateur.role === 'client') {
    return mission.clientId === utilisateur.clientId;
  }

  return false;
}

// Retourne les identifiants des clients visibles, ou null lorsque l'utilisateur
// a le droit de consulter tout le portefeuille du cabinet.
async function idsClientsAutorises(utilisateur) {
  if (['administrateur', 'expert_comptable'].includes(utilisateur.role)) {
    return null;
  }

  if (utilisateur.role === 'client') {
    return utilisateur.clientId ? [utilisateur.clientId] : [];
  }

  const missions = await missionsService.lister();

  return missions
    .filter((mission) => missionVisiblePar(mission, utilisateur))
    .map((mission) => mission.clientId);
}

// Un auditeur ou un client ne doit pas récupérer les coordonnées de tout le
// cabinet : il ne reçoit que de quoi afficher un nom.
const CHAMPS_ANNUAIRE = ['id', 'nom', 'prenom', 'photo', 'role'];

function annuaireReduitPour(utilisateur) {
  return ['auditeur', 'client'].includes(utilisateur.role);
}

function reduireAAnnuaire(utilisateur) {
  return Object.fromEntries(
    CHAMPS_ANNUAIRE.map((champ) => [champ, utilisateur[champ]]),
  );
}

async function verifierActeursMission(donnees) {
  if (donnees.clientId) {
    const client = await clientsService.trouver(donnees.clientId);
    if (!client) {
      throw new Error('CLIENT_INTROUVABLE');
    }
  }

  if (donnees.expertComptableId) {
    const expert = await utilisateursService.trouverComplet(
      donnees.expertComptableId,
    );

    if (!expert || expert.role !== 'expert_comptable') {
      throw new Error('EXPERT_INVALIDE');
    }
  }

  if (donnees.auditeurs) {
    const identifiantsUniques = [...new Set(donnees.auditeurs)];
    const auditeurs = await Promise.all(
      identifiantsUniques.map((id) => utilisateursService.trouverComplet(id)),
    );

    const auditeurInvalide = auditeurs.some(
      (auditeur) => !auditeur || auditeur.role !== 'auditeur',
    );

    if (auditeurInvalide) {
      throw new Error('AUDITEUR_INVALIDE');
    }
  }
}

// Authentification

app.openapi(routes.connexionRoute, async (c) => {
  const { email, mot_de_passe } = c.req.valid('json');
  let resultat;

  try {
    resultat = await authService.connecter(email, mot_de_passe);
  } catch (erreur) {
    if (erreur.message === authService.IDENTIFIANTS_INVALIDES) {
      return c.json({ erreur: 'Email ou mot de passe incorrect.' }, 401);
    }

    // Base injoignable, panne réseau... : ne pas les déguiser en erreur
    // d'identifiants, sinon le diagnostic devient impossible.
    throw erreur;
  }

  await journaliser('Connexion', resultat.utilisateur.id);

  return c.json(resultat, 200);
});

app.openapi(routes.deconnexionRoute, (c) => {
  return c.json({ message: 'Déconnexion réussie.' }, 200);
});

app.openapi(routes.profilRoute, (c) => {
  const utilisateur = c.get('utilisateur');
  const { mot_de_passe, ...profil } = utilisateur;
  return c.json(profil, 200);
});

// Utilisateurs

app.openapi(routes.listerUtilisateursRoute, async (c) => {
  const utilisateurConnecte = c.get('utilisateur');
  const utilisateurs = await utilisateursService.lister();

  if (!annuaireReduitPour(utilisateurConnecte)) {
    return c.json(utilisateurs, 200);
  }

  const annuaire = utilisateurs.map((utilisateur) => (
    utilisateur.id === utilisateurConnecte.id
      ? utilisateur
      : reduireAAnnuaire(utilisateur)
  ));

  return c.json(annuaire, 200);
});

app.openapi(routes.creerUtilisateurRoute, async (c) => {
  const donnees = c.req.valid('json');
  const utilisateurConnecte = c.get('utilisateur');

  const administrateur = utilisateurConnecte.role === 'administrateur';
  const expertQuiCreeUnClient =
    utilisateurConnecte.role === 'expert_comptable'
    && donnees.role === 'client';

  if (!administrateur && !expertQuiCreeUnClient) {
    return reponseInterdite(c);
  }

  const utilisateur = await utilisateursService.creer(donnees);

  await enregistrerAction(
    c,
    `Création de l'utilisateur ${utilisateur.prenom} ${utilisateur.nom}`,
  );

  return c.json(utilisateur, 201);
});

app.openapi(routes.detailUtilisateurRoute, async (c) => {
  const { id } = c.req.valid('param');
  const utilisateur = await utilisateursService.trouver(id);

  if (!utilisateur) {
    return reponseIntrouvable(c, 'Utilisateur');
  }

  const utilisateurConnecte = c.get('utilisateur');

  if (annuaireReduitPour(utilisateurConnecte) && utilisateur.id !== utilisateurConnecte.id) {
    return c.json(reduireAAnnuaire(utilisateur), 200);
  }

  return c.json(utilisateur, 200);
});

app.openapi(routes.modifierUtilisateurRoute, async (c) => {
  const { id } = c.req.valid('param');
  const utilisateurConnecte = c.get('utilisateur');
  const estAdministrateur = utilisateurConnecte.role === 'administrateur';

  const peutModifier = estAdministrateur || utilisateurConnecte.id === id;

  if (!peutModifier) {
    return reponseInterdite(c);
  }

  const utilisateurExistant = await utilisateursService.trouver(id);
  if (!utilisateurExistant) {
    return reponseIntrouvable(c, 'Utilisateur');
  }

  const { ancien_mot_de_passe, ...champs } = c.req.valid('json');
  const donnees = champsRenseignes(champs);

  if (!estAdministrateur) {
    delete donnees.role;
    delete donnees.statut;
    delete donnees.clientId;
  }

  if (!Object.keys(donnees).length) {
    return aucunChampAModifier(c);
  }

  // Changer son propre mot de passe suppose de prouver que la session est bien
  // celle du titulaire du compte. L'administrateur, lui, peut réinitialiser.
  if (donnees.mot_de_passe && utilisateurConnecte.id === id) {
    const ancienValide = ancien_mot_de_passe
      && await authService.motDePasseCorrespond(utilisateurConnecte, ancien_mot_de_passe);

    if (!ancienValide) {
      return c.json({ erreur: 'Ancien mot de passe incorrect.' }, 400);
    }
  }

  const roleFinal = donnees.role ?? utilisateurExistant.role;
  const clientIdFinal = donnees.clientId ?? utilisateurExistant.clientId;

  if (roleFinal === 'client' && !clientIdFinal) {
    return c.json({
      erreur: 'Un compte de rôle client doit être rattaché à un client.',
    }, 400);
  }

  const utilisateur = await utilisateursService.modifier(id, donnees);
  await enregistrerAction(c, `Modification de l'utilisateur ${id}`);

  return c.json(utilisateur, 200);
});

app.openapi(routes.supprimerUtilisateurRoute, async (c) => {
  const utilisateurConnecte = c.get('utilisateur');

  if (utilisateurConnecte.role !== 'administrateur') {
    return reponseInterdite(c);
  }

  const { id } = c.req.valid('param');

  if (id === utilisateurConnecte.id) {
    return c.json({
      erreur: 'Vous ne pouvez pas supprimer votre propre compte.',
    }, 409);
  }

  const utilisateur = await utilisateursService.supprimer(id);

  if (!utilisateur) {
    return reponseIntrouvable(c, 'Utilisateur');
  }

  await enregistrerAction(c, `Suppression de l'utilisateur ${id}`);
  return c.json(utilisateur, 200);
});

// Clients

app.openapi(routes.listerClientsRoute, async (c) => {
  const idsAutorises = await idsClientsAutorises(c.get('utilisateur'));
  const clients = await clientsService.lister(idsAutorises);
  return c.json(clients, 200);
});

app.openapi(routes.creerClientRoute, async (c) => {
  const utilisateur = c.get('utilisateur');
  const rolesAutorises = ['administrateur', 'expert_comptable'];

  if (!rolesAutorises.includes(utilisateur.role)) {
    return reponseInterdite(c);
  }

  const donnees = c.req.valid('json');
  const client = await clientsService.creer(donnees);

  await enregistrerAction(c, `Création du client ${client.raison_sociale}`);
  return c.json(client, 201);
});

app.openapi(routes.detailClientRoute, async (c) => {
  const { id } = c.req.valid('param');
  const client = await clientsService.trouver(id);

  if (!client) {
    return reponseIntrouvable(c, 'Client');
  }

  const idsAutorises = await idsClientsAutorises(c.get('utilisateur'));

  if (idsAutorises && !idsAutorises.includes(client.id)) {
    return reponseInterdite(c, 'Accès interdit à ce client.');
  }

  return c.json(client, 200);
});

app.openapi(routes.modifierClientRoute, async (c) => {
  const utilisateur = c.get('utilisateur');
  const rolesAutorises = ['administrateur', 'expert_comptable'];

  if (!rolesAutorises.includes(utilisateur.role)) {
    return reponseInterdite(c);
  }

  const { id } = c.req.valid('param');
  const clientExistant = await clientsService.trouver(id);

  if (!clientExistant) {
    return reponseIntrouvable(c, 'Client');
  }

  const donnees = champsRenseignes(c.req.valid('json'));

  if (!Object.keys(donnees).length) {
    return aucunChampAModifier(c);
  }

  const client = await clientsService.modifier(id, donnees);

  await enregistrerAction(c, `Modification du client ${id}`);
  return c.json(client, 200);
});

app.openapi(routes.supprimerClientRoute, async (c) => {
  const utilisateur = c.get('utilisateur');
  const rolesAutorises = ['administrateur', 'expert_comptable'];

  if (!rolesAutorises.includes(utilisateur.role)) {
    return reponseInterdite(c);
  }

  const { id } = c.req.valid('param');
  const client = await clientsService.supprimer(id);

  if (!client) {
    return reponseIntrouvable(c, 'Client');
  }

  await enregistrerAction(c, `Suppression du client ${id}`);
  return c.json(client, 200);
});

// Missions

app.openapi(routes.listerMissionsRoute, async (c) => {
  const utilisateur = c.get('utilisateur');
  const filtres = c.req.valid('query');
  const missions = await missionsService.lister(filtres);
  const missionsVisibles = missions.filter((mission) => (
    missionVisiblePar(mission, utilisateur)
  ));

  return c.json(missionsVisibles, 200);
});

app.openapi(routes.detailMissionRoute, async (c) => {
  const { id } = c.req.valid('param');
  const mission = await missionsService.trouver(id);

  if (!mission) {
    return reponseIntrouvable(c, 'Mission');
  }

  if (!missionVisiblePar(mission, c.get('utilisateur'))) {
    return reponseInterdite(c, 'Accès interdit à cette mission.');
  }

  return c.json(mission, 200);
});

app.openapi(routes.creerMissionRoute, async (c) => {
  const utilisateur = c.get('utilisateur');
  const rolesAutorises = ['administrateur', 'expert_comptable'];

  if (!rolesAutorises.includes(utilisateur.role)) {
    return reponseInterdite(c);
  }

  const donnees = c.req.valid('json');
  await verifierActeursMission(donnees);

  const mission = await missionsService.creer(donnees);
  await enregistrerAction(c, `Création de la mission ${mission.titre}`);

  return c.json(mission, 201);
});

app.openapi(routes.modifierMissionRoute, async (c) => {
  const { id } = c.req.valid('param');
  const missionExistante = await missionsService.trouver(id);

  if (!missionExistante) {
    return reponseIntrouvable(c, 'Mission');
  }

  const utilisateur = c.get('utilisateur');

  if (
    !missionVisiblePar(missionExistante, utilisateur)
    || utilisateur.role === 'client'
  ) {
    return reponseInterdite(c);
  }

  let donnees = c.req.valid('json');

  // Un auditeur ne pilote que l'avancement et le statut de ses missions.
  if (utilisateur.role === 'auditeur') {
    donnees = {
      avancement: donnees.avancement,
      statut: donnees.statut,
    };
  }

  donnees = champsRenseignes(donnees);

  if (!Object.keys(donnees).length) {
    return aucunChampAModifier(c);
  }

  // Les dates envoyées sont comparées aux valeurs déjà enregistrées : une
  // modification partielle ne doit pas pouvoir rendre la mission incohérente.
  // Le contrôle ne s'applique qu'aux requêtes qui touchent effectivement à une
  // date, pour ne pas bloquer la mise à jour d'une mission déjà enregistrée
  // avec des dates incohérentes.
  const modifieUneDate = donnees.date_debut !== undefined
    || donnees.date_fin_prevue !== undefined;

  if (modifieUneDate) {
    const dateDebut = donnees.date_debut ?? missionExistante.date_debut;
    const dateFinPrevue = donnees.date_fin_prevue ?? missionExistante.date_fin_prevue;

    if (dateFinPrevue <= dateDebut) {
      return c.json({
        erreur: 'La date de fin prévue doit être postérieure à la date de début.',
      }, 400);
    }
  }

  await verifierActeursMission(donnees);

  const mission = await missionsService.modifier(id, donnees);
  await enregistrerAction(c, `Modification de la mission ${id}`);

  return c.json(mission, 200);
});

app.openapi(routes.affecterAuditeursRoute, async (c) => {
  const { id } = c.req.valid('param');
  const missionExistante = await missionsService.trouver(id);

  if (!missionExistante) {
    return reponseIntrouvable(c, 'Mission');
  }

  if (!missionVisiblePar(missionExistante, c.get('utilisateur'))) {
    return reponseInterdite(c, 'Accès interdit à cette mission.');
  }

  const donnees = c.req.valid('json');
  await verifierActeursMission(donnees);

  const mission = await missionsService.affecter(id, donnees.auditeurs);
  await enregistrerAction(c, `Affectation des auditeurs à la mission ${id}`);

  return c.json(mission, 200);
});

app.openapi(routes.supprimerMissionRoute, async (c) => {
  const utilisateur = c.get('utilisateur');
  const rolesAutorises = ['administrateur', 'expert_comptable'];

  if (!rolesAutorises.includes(utilisateur.role)) {
    return reponseInterdite(c);
  }

  const { id } = c.req.valid('param');
  const missionExistante = await missionsService.trouver(id);

  if (!missionExistante) {
    return reponseIntrouvable(c, 'Mission');
  }

  // Un expert-comptable ne supprime que les missions dont il est responsable.
  if (!missionVisiblePar(missionExistante, utilisateur)) {
    return reponseInterdite(c, 'Accès interdit à cette mission.');
  }

  const mission = await missionsService.supprimer(id);

  await enregistrerAction(c, `Suppression de la mission ${id}`);
  return c.json(mission, 200);
});

// Documents

app.openapi(routes.listerDocumentsRoute, async (c) => {
  const utilisateur = c.get('utilisateur');
  const filtres = c.req.valid('query');
  const missions = await missionsService.lister();

  const idsMissionsVisibles = missions
    .filter((mission) => missionVisiblePar(mission, utilisateur))
    .map((mission) => mission.id);

  const documents = await documentsService.lister(filtres);
  const documentsVisibles = documents.filter((document) => (
    idsMissionsVisibles.includes(document.missionId)
  ));

  return c.json(documentsVisibles, 200);
});

app.openapi(routes.detailDocumentRoute, async (c) => {
  const { id } = c.req.valid('param');
  const document = await documentsService.trouver(id);

  if (!document) {
    return reponseIntrouvable(c, 'Document');
  }

  const mission = await missionsService.trouver(document.missionId);

  if (!missionVisiblePar(mission, c.get('utilisateur'))) {
    return reponseInterdite(c);
  }

  return c.json(document, 200);
});

app.openapi(routes.creerDocumentRoute, async (c) => {
  const utilisateur = c.get('utilisateur');

  if (utilisateur.role === 'client') {
    return reponseInterdite(c);
  }

  const donnees = c.req.valid('json');
  const mission = await missionsService.trouver(donnees.missionId);

  if (!mission) {
    return reponseIntrouvable(c, 'Mission');
  }

  if (!missionVisiblePar(mission, utilisateur)) {
    return reponseInterdite(c);
  }

  const document = await documentsService.creer({
    ...donnees,
    utilisateurId: utilisateur.id,
  });

  await enregistrerAction(c, `Ajout du document ${document.titre}`);
  return c.json(document, 201);
});

app.openapi(routes.supprimerDocumentRoute, async (c) => {
  const utilisateur = c.get('utilisateur');

  if (utilisateur.role === 'client') {
    return reponseInterdite(c);
  }

  const { id } = c.req.valid('param');
  const documentExistant = await documentsService.trouver(id);

  if (!documentExistant) {
    return reponseIntrouvable(c, 'Document');
  }

  const mission = await missionsService.trouver(documentExistant.missionId);

  if (!missionVisiblePar(mission, utilisateur)) {
    return reponseInterdite(c);
  }

  const document = await documentsService.supprimer(id);
  await enregistrerAction(c, `Suppression du document ${id}`);

  return c.json(document, 200);
});

// Téléversement Cloudinary

app.openapi(routes.uploadRoute, async (c) => {
  const { fichier } = c.req.valid('form');
  const tailleMaximale = 10 * 1024 * 1024;

  if (fichier.size > tailleMaximale) {
    return c.json({ erreur: 'Le fichier ne doit pas dépasser 10 Mo.' }, 400);
  }

  const buffer = Buffer.from(await fichier.arrayBuffer());
  const resultat = await uploadFichier(buffer);

  return c.json({
    url: resultat.secure_url,
    publicId: resultat.public_id,
  }, 201);
});

// Journal d'activité

app.openapi(routes.listerJournalRoute, async (c) => {
  const journal = await journalService.lister();
  return c.json(journal, 200);
});

// Erreurs et documentation

app.notFound((c) => {
  return c.json({ erreur: 'Route introuvable.' }, 404);
});

app.onError((erreur, c) => {
  console.error(erreur);

  const code = erreur?.code ?? erreur?.cause?.code;

  if (code === '23505') {
    return c.json({ erreur: 'Cette valeur existe déjà.' }, 409);
  }

  if (code === '23503') {
    return c.json({
      erreur: 'Cette opération viole une relation entre les données.',
    }, 409);
  }

  if (erreur.message === 'CLIENT_INTROUVABLE') {
    return c.json({ erreur: 'Client introuvable.' }, 400);
  }

  if (erreur.message === 'EXPERT_INVALIDE') {
    return c.json({ erreur: 'Expert-comptable invalide.' }, 400);
  }

  if (erreur.message === 'AUDITEUR_INVALIDE') {
    return c.json({ erreur: 'Un auditeur est invalide.' }, 400);
  }

  return c.json({ erreur: 'Erreur interne du serveur.' }, 500);
});

const port = Number(process.env.PORT) || 3000;

app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'API AuditFlow',
    version: '1.0.0',
    description: "Gestion des missions d'audit",
  },
  servers: [
    {
      url: `http://localhost:${port}`,
      description: 'Serveur local',
    },
  ],
});

app.get('/ui', swaggerUI({ url: '/doc' }));

app.get('/', (c) => {
  return c.json({
    nom: 'API AuditFlow',
    documentation: '/ui',
  });
});

console.log(`Serveur lancé sur http://localhost:${port}`);
console.log(`Swagger UI : http://localhost:${port}/ui`);

// Exporté pour que les tests puissent fermer le serveur en fin d'exécution.
export const serveur = serve({
  fetch: app.fetch,
  port,
});

export default app;
