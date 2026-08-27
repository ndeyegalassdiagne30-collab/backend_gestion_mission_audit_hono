import { z } from '@hono/zod-openapi';

export const ROLES = ['administrateur', 'expert_comptable', 'auditeur', 'client'];
export const STATUTS_GENERIQUES = ['actif', 'inactif'];
export const STATUTS_MISSION = ['en_cours', 'en_relecture', 'termine'];

const dateIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format attendu : AAAA-MM-JJ');
const telephone = z.string().regex(/^\d{9}$/, 'Le téléphone doit contenir 9 chiffres');
const id = z.coerce.number().int().positive();

export const IdParamSchema = z.object({
  id: id.openapi({
  param: { 
  name: 'id', in: 'path' } }),
});
export const ErreurSchema = z.object({ 
erreur: z.string() }).openapi('Erreur');
export const ErreurValidationSchema = z.object({
  erreur: z.string(),
  details: z.array(z.object({
  champ: z.string(), 
  message: z.string() })),
}).openapi('ErreurValidation');
export const MessageSchema = z.object({
message: z.string() }).openapi('Message');

export const FileSchema = z
  .custom((valeur) => valeur instanceof File, 'Un fichier est requis')
  .openapi({ type: 'string', format: 'binary' });

export const UploadFormSchema = z.object({
  fichier: FileSchema,
}).openapi('UploadForm');

export const UploadSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
}).openapi('Upload');

// Les champs sensibles sont facultatifs : un auditeur ou un client ne reçoit
// qu'un annuaire réduit (id, nom, prénom, photo, rôle).
export const UtilisateurSchema = z.object({
  id: z.number(),
  nom: z.string(),
  prenom: z.string(),
  email: z.string().email().optional(),
  telephone: z.string().optional(),
  photo: z.string(),
  date_creation: z.string().optional(),
  role: z.enum(ROLES),
  statut: z.enum(STATUTS_GENERIQUES).optional(),
  clientId: z.number().nullable().optional(),
}).openapi('Utilisateur');

const UtilisateurBaseSchema = z.object({
  nom: z.string().trim().min(1),
  prenom: z.string().trim().min(1),
  email: z.string().email(),
  mot_de_passe: z.string().min(6),
  telephone,
  photo: z.string().url().or(z.literal('')).optional(),
  role: z.enum(ROLES),
  statut: z.enum(STATUTS_GENERIQUES).optional(),
  clientId: id.optional(),
});

// Un compte de rôle client sans clientId ne verrait aucune mission.
const compteClientRattache = (utilisateur) => (
  utilisateur.role !== 'client' || utilisateur.clientId !== undefined
);

const messageRattachement = {
  message: 'Un compte de rôle client doit être rattaché à un client.',
  path: ['clientId'],
};

export const CreerUtilisateurSchema = UtilisateurBaseSchema
  .refine(compteClientRattache, messageRattachement)
  .openapi('CreerUtilisateur');

// La cohérence rôle/clientId est revérifiée dans le traitement de la route :
// une modification partielle doit être comparée aux valeurs déjà enregistrées.
export const ModifierUtilisateurSchema = UtilisateurBaseSchema.partial().extend({
  ancien_mot_de_passe: z.string().min(1).optional(),
}).openapi('ModifierUtilisateur');
export const ConnexionSchema = z.object({
  email: z.string().email(), 
  mot_de_passe: z.string().min(1),
}).openapi('Connexion');

export const TokenSchema = z.object({ 
  token: z.string(), 
  utilisateur: UtilisateurSchema }).openapi('Token');

export const ClientSchema = z.object({
  id: z.number(), 
  raison_sociale: z.string(), 
  ninea: z.string(), 
  adresse: z.string(),
  email: z.string().email().nullable(), 
  telephone: z.string(), 
  date_creation: z.string(),
  statut: z.enum(STATUTS_GENERIQUES),
}).openapi('Client');

export const CreerClientSchema = z.object({
  raison_sociale: z.string().trim().min(1), 
  ninea: z.string().trim().min(1),
  adresse: z.string().trim().min(1), 
  email: z.string().email().nullable().optional(), 
  telephone,
  date_creation: dateIso.optional(), 
  statut: z.enum(STATUTS_GENERIQUES).optional(),
}).openapi('CreerClient');
export const ModifierClientSchema = CreerClientSchema.partial().openapi('ModifierClient');

export const MissionSchema = z.object({
  id: z.number(), 
  titre: z.string(), 
  description: z.string(), 
  date_debut: z.string(),
  date_fin_prevue: z.string(), 
  date_fin_reelle: z.string().nullable(), 
  avancement: z.number(),
  statut: z.enum(STATUTS_MISSION), 
  date_creation: z.string(), 
  clientId: z.number(),
  expertComptableId: z.number(), 
  auditeurs: z.array(z.number()),
}).openapi('Mission');

export const CreerMissionSchema = z.object({
  titre: z.string().trim().min(1), 
  description: z.string().optional(), 
  date_debut: dateIso,
  date_fin_prevue: dateIso, 
  date_fin_reelle: dateIso.nullable().optional(),
  avancement: z.coerce.number().int().min(0).max(100).optional(),
  statut: z.enum(STATUTS_MISSION).optional(), 
  clientId: id, 
  expertComptableId: id,
  auditeurs: z.array(id).optional(),
}).refine((m) => m.date_fin_prevue > m.date_debut, {
  message: 'La date de fin prévue doit être postérieure à la date de début', path: ['date_fin_prevue'],
}).openapi('CreerMission');

export const ModifierMissionSchema = z.object({
  titre: z.string().trim().min(1).optional(), 
  description: z.string().optional(), 
  date_debut: dateIso.optional(),
  date_fin_prevue: dateIso.optional(), 
  date_fin_reelle: dateIso.nullable().optional(),
  avancement: z.coerce.number().int().min(0).max(100).optional(), 
  statut: z.enum(STATUTS_MISSION).optional(),
  clientId: id.optional(), 
  expertComptableId: id.optional(), 
  auditeurs: z.array(id).optional(),
}).openapi('ModifierMission');

export const AffecterAuditeursSchema = z.object({
   auditeurs: z.array(id) }).openapi('AffecterAuditeurs');

// Filtres facultatifs appliqués directement en SQL.
export const FiltreMissionsSchema = z.object({
  statut: z.enum(STATUTS_MISSION).optional()
    .openapi({ param: { name: 'statut', in: 'query' } }),
  clientId: id.optional()
    .openapi({ param: { name: 'clientId', in: 'query' } }),
});

export const DocumentSchema = z.object({
  id: z.number(), 
  titre: z.string(), 
  nom_fichier: z.string(), 
  chemin: z.string(),
  description: z.string(), 
  date_upload: z.string(), 
  taille: z.number().nullable(),
  missionId: z.number(), 
  utilisateurId: z.number(),
}).openapi('Document');

export const FiltreDocumentsSchema = z.object({
  missionId: id.optional()
    .openapi({ param: { name: 'missionId', in: 'query' } }),
});

export const CreerDocumentSchema = z.object({
  titre: z.string().trim().min(1), 
  nom_fichier: z.string().trim().min(1), 
  chemin: z.string().url(),
  description: z.string().optional(), 
  taille: z.coerce.number().int().nonnegative().nullable().optional(), 
  missionId: id,
}).openapi('CreerDocument');

export const JournalSchema = z.object({
  id: z.number(), 
  action: z.string(), 
  date_action: z.string(), 
  utilisateurId: z.number().nullable(),
}).openapi('JournalActivite');
