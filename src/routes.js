import { createRoute, z } from '@hono/zod-openapi';
import {
  IdParamSchema,
  ErreurSchema,
  ErreurValidationSchema,
  MessageSchema,
  UploadFormSchema,
  UploadSchema,
  ConnexionSchema,
  TokenSchema,
  UtilisateurSchema,
  CreerUtilisateurSchema,
  ModifierUtilisateurSchema,
  ClientSchema,
  CreerClientSchema,
  ModifierClientSchema,
  MissionSchema,
  CreerMissionSchema,
  ModifierMissionSchema,
  AffecterAuditeursSchema,
  DocumentSchema,
  CreerDocumentSchema,
  FiltreMissionsSchema,
  FiltreDocumentsSchema,
  JournalSchema,
} from './schemas.js';

const json = (schema) => ({ 'application/json': { schema } });
const securite = [{ Bearer: [] }];

const erreur400 = {
  description: 'Données invalides',
  content: json(ErreurValidationSchema),
};

const erreur401 = {
  description: 'Authentification requise',
  content: json(ErreurSchema),
};

const erreur403 = {
  description: 'Accès interdit',
  content: json(ErreurSchema),
};

const erreur404 = {
  description: 'Ressource introuvable',
  content: json(ErreurSchema),
};

const erreur409 = {
  description: 'Conflit avec les données existantes',
  content: json(ErreurSchema),
};

// Authentification

export const connexionRoute = createRoute({
  method: 'post',
  path: '/auth/login',
  tags: ['Authentification'],
  summary: 'Se connecter',
  request: {
    body: { content: json(ConnexionSchema) },
  },
  responses: {
    200: { description: 'Connexion réussie', content: json(TokenSchema) },
    400: erreur400,
    401: erreur401,
  },
});

export const deconnexionRoute = createRoute({
  method: 'post',
  path: '/auth/logout',
  tags: ['Authentification'],
  summary: 'Se déconnecter',
  security: securite,
  responses: {
    200: { description: 'Déconnexion réussie', content: json(MessageSchema) },
    401: erreur401,
  },
});

export const profilRoute = createRoute({
  method: 'get',
  path: '/auth/me',
  tags: ['Authentification'],
  summary: 'Afficher mon profil',
  security: securite,
  responses: {
    200: { description: 'Profil connecté', content: json(UtilisateurSchema) },
    401: erreur401,
  },
});

// Utilisateurs

export const listerUtilisateursRoute = createRoute({
  method: 'get',
  path: '/utilisateurs',
  tags: ['Utilisateurs'],
  summary: 'Lister les utilisateurs',
  security: securite,
  responses: {
    200: { description: 'Liste des utilisateurs', content: json(z.array(UtilisateurSchema)) },
    401: erreur401,
  },
});

export const creerUtilisateurRoute = createRoute({
  method: 'post',
  path: '/utilisateurs',
  tags: ['Utilisateurs'],
  summary: 'Créer un utilisateur',
  security: securite,
  request: {
    body: { content: json(CreerUtilisateurSchema) },
  },
  responses: {
    201: { description: 'Utilisateur créé', content: json(UtilisateurSchema) },
    400: erreur400,
    401: erreur401,
    403: erreur403,
    409: erreur409,
  },
});

export const detailUtilisateurRoute = createRoute({
  method: 'get',
  path: '/utilisateurs/{id}',
  tags: ['Utilisateurs'],
  summary: 'Afficher un utilisateur',
  security: securite,
  request: { params: IdParamSchema },
  responses: {
    200: { description: 'Utilisateur trouvé', content: json(UtilisateurSchema) },
    401: erreur401,
    404: erreur404,
  },
});

export const modifierUtilisateurRoute = createRoute({
  method: 'patch',
  path: '/utilisateurs/{id}',
  tags: ['Utilisateurs'],
  summary: 'Modifier un utilisateur',
  security: securite,
  request: {
    params: IdParamSchema,
    body: { content: json(ModifierUtilisateurSchema) },
  },
  responses: {
    200: { description: 'Utilisateur modifié', content: json(UtilisateurSchema) },
    400: erreur400,
    401: erreur401,
    403: erreur403,
    404: erreur404,
    409: erreur409,
  },
});

export const supprimerUtilisateurRoute = createRoute({
  method: 'delete',
  path: '/utilisateurs/{id}',
  tags: ['Utilisateurs'],
  summary: 'Supprimer un utilisateur',
  security: securite,
  request: { params: IdParamSchema },
  responses: {
    200: { description: 'Utilisateur supprimé', content: json(UtilisateurSchema) },
    401: erreur401,
    403: erreur403,
    404: erreur404,
    409: erreur409,
  },
});

// Clients

export const listerClientsRoute = createRoute({
  method: 'get',
  path: '/clients',
  tags: ['Clients'],
  summary: 'Lister les clients',
  security: securite,
  responses: {
    200: { description: 'Liste des clients', content: json(z.array(ClientSchema)) },
    401: erreur401,
  },
});

export const creerClientRoute = createRoute({
  method: 'post',
  path: '/clients',
  tags: ['Clients'],
  summary: 'Créer un client',
  security: securite,
  request: {
    body: { content: json(CreerClientSchema) },
  },
  responses: {
    201: { description: 'Client créé', content: json(ClientSchema) },
    400: erreur400,
    401: erreur401,
    403: erreur403,
    409: erreur409,
  },
});

export const detailClientRoute = createRoute({
  method: 'get',
  path: '/clients/{id}',
  tags: ['Clients'],
  summary: 'Afficher un client',
  security: securite,
  request: { params: IdParamSchema },
  responses: {
    200: { description: 'Client trouvé', content: json(ClientSchema) },
    401: erreur401,
    403: erreur403,
    404: erreur404,
  },
});

export const modifierClientRoute = createRoute({
  method: 'patch',
  path: '/clients/{id}',
  tags: ['Clients'],
  summary: 'Modifier un client',
  security: securite,
  request: {
    params: IdParamSchema,
    body: { content: json(ModifierClientSchema) },
  },
  responses: {
    200: { description: 'Client modifié', content: json(ClientSchema) },
    400: erreur400,
    401: erreur401,
    403: erreur403,
    404: erreur404,
    409: erreur409,
  },
});

export const supprimerClientRoute = createRoute({
  method: 'delete',
  path: '/clients/{id}',
  tags: ['Clients'],
  summary: 'Supprimer un client',
  security: securite,
  request: { params: IdParamSchema },
  responses: {
    200: { description: 'Client supprimé', content: json(ClientSchema) },
    401: erreur401,
    403: erreur403,
    404: erreur404,
    409: erreur409,
  },
});

// Missions

export const listerMissionsRoute = createRoute({
  method: 'get',
  path: '/missions',
  tags: ['Missions'],
  summary: 'Lister les missions autorisées',
  security: securite,
  request: { query: FiltreMissionsSchema },
  responses: {
    200: { description: 'Liste des missions', content: json(z.array(MissionSchema)) },
    400: erreur400,
    401: erreur401,
  },
});

export const creerMissionRoute = createRoute({
  method: 'post',
  path: '/missions',
  tags: ['Missions'],
  summary: 'Créer une mission',
  security: securite,
  request: {
    body: { content: json(CreerMissionSchema) },
  },
  responses: {
    201: { description: 'Mission créée', content: json(MissionSchema) },
    400: erreur400,
    401: erreur401,
    403: erreur403,
    409: erreur409,
  },
});

export const detailMissionRoute = createRoute({
  method: 'get',
  path: '/missions/{id}',
  tags: ['Missions'],
  summary: 'Afficher une mission',
  security: securite,
  request: { params: IdParamSchema },
  responses: {
    200: { description: 'Mission trouvée', content: json(MissionSchema) },
    401: erreur401,
    403: erreur403,
    404: erreur404,
  },
});

export const modifierMissionRoute = createRoute({
  method: 'patch',
  path: '/missions/{id}',
  tags: ['Missions'],
  summary: 'Modifier une mission',
  security: securite,
  request: {
    params: IdParamSchema,
    body: { content: json(ModifierMissionSchema) },
  },
  responses: {
    200: { description: 'Mission modifiée', content: json(MissionSchema) },
    400: erreur400,
    401: erreur401,
    403: erreur403,
    404: erreur404,
    409: erreur409,
  },
});

export const supprimerMissionRoute = createRoute({
  method: 'delete',
  path: '/missions/{id}',
  tags: ['Missions'],
  summary: 'Supprimer une mission',
  security: securite,
  request: { params: IdParamSchema },
  responses: {
    200: { description: 'Mission supprimée', content: json(MissionSchema) },
    401: erreur401,
    403: erreur403,
    404: erreur404,
    409: erreur409,
  },
});

export const affecterAuditeursRoute = createRoute({
  method: 'patch',
  path: '/missions/{id}/auditeurs',
  tags: ['Missions'],
  summary: 'Affecter les auditeurs',
  security: securite,
  request: {
    params: IdParamSchema,
    body: { content: json(AffecterAuditeursSchema) },
  },
  responses: {
    200: { description: 'Auditeurs affectés', content: json(MissionSchema) },
    400: erreur400,
    401: erreur401,
    403: erreur403,
    404: erreur404,
  },
});

// Documents

export const listerDocumentsRoute = createRoute({
  method: 'get',
  path: '/documents',
  tags: ['Documents'],
  summary: 'Lister les documents autorisés',
  security: securite,
  request: { query: FiltreDocumentsSchema },
  responses: {
    200: { description: 'Liste des documents', content: json(z.array(DocumentSchema)) },
    400: erreur400,
    401: erreur401,
  },
});

export const creerDocumentRoute = createRoute({
  method: 'post',
  path: '/documents',
  tags: ['Documents'],
  summary: 'Ajouter un document',
  security: securite,
  request: {
    body: { content: json(CreerDocumentSchema) },
  },
  responses: {
    201: { description: 'Document ajouté', content: json(DocumentSchema) },
    400: erreur400,
    401: erreur401,
    403: erreur403,
    404: erreur404,
  },
});

export const detailDocumentRoute = createRoute({
  method: 'get',
  path: '/documents/{id}',
  tags: ['Documents'],
  summary: 'Afficher un document',
  security: securite,
  request: { params: IdParamSchema },
  responses: {
    200: { description: 'Document trouvé', content: json(DocumentSchema) },
    401: erreur401,
    403: erreur403,
    404: erreur404,
  },
});

export const supprimerDocumentRoute = createRoute({
  method: 'delete',
  path: '/documents/{id}',
  tags: ['Documents'],
  summary: 'Supprimer un document',
  security: securite,
  request: { params: IdParamSchema },
  responses: {
    200: { description: 'Document supprimé', content: json(DocumentSchema) },
    401: erreur401,
    403: erreur403,
    404: erreur404,
  },
});

// Téléversement Cloudinary

export const uploadRoute = createRoute({
  method: 'post',
  path: '/uploads',
  tags: ['Uploads'],
  summary: 'Téléverser un fichier sur Cloudinary',
  security: securite,
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: UploadFormSchema,
        },
      },
    },
  },
  responses: {
    201: { description: 'Fichier téléversé', content: json(UploadSchema) },
    400: erreur400,
    401: erreur401,
    500: { description: "Erreur lors de l'envoi", content: json(ErreurSchema) },
  },
});

// Journal d'activité

export const listerJournalRoute = createRoute({
  method: 'get',
  path: '/journaux_activites',
  tags: ['Journal'],
  summary: "Lister le journal d'activité",
  security: securite,
  responses: {
    200: { description: "Liste du journal d'activité", content: json(z.array(JournalSchema)) },
    401: erreur401,
    403: erreur403,
  },
});
