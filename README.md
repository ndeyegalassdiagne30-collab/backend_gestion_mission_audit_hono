# AuditFlow : Backend Hono, Swagger et PostgreSQL

## 1. Présentation du projet

AuditFlow est une application de gestion des missions d'audit destinée aux cabinets d'expertise comptable.

Le projet permet de gérer :

* les utilisateurs du cabinet ;

* les clients audités ;

* les missions d'audit ;

* les auditeurs affectés aux missions ;

* l'avancement et le statut des missions ;

* les documents associés aux missions ;

* le journal des activités réalisées dans l'application.

Au début du projet, les données étaient simulées avec `json-server` et le fichier `db.json`. Ce backend remplace cette simulation par une véritable API HTTP développée avec Hono et une base de données PostgreSQL.

## 2. Technologies utilisées

* **Node.js** : exécution du JavaScript côté serveur ;

* **Hono** : création de l'API et des routes HTTP ;

* **Zod OpenAPI** : validation des données reçues ;

* **Swagger UI** : documentation et test des routes ;

* **PostgreSQL** : stockage permanent des données ;

* **Drizzle ORM** : communication entre JavaScript et PostgreSQL ;

* **Drizzle Kit** : génération et exécution des migrations ;

* **bcryptjs** : hachage des mots de passe ;

* **JWT** : authentification des utilisateurs ;

* **dotenv** : chargement des variables du fichier `.env` ;

* **Cloudinary** : stockage des images et des documents téléversés ;

* **CORS** : autorisation de la communication entre le frontend et le backend.

## 3. Architecture générale

```text
Navigateur
   |
   | http://localhost:5500
   v
Frontend JavaScript
   |
   | fetch + JSON + JWT
   v
Backend Hono http://localhost:3002
   |                    |
   | Drizzle ORM        | SDK Cloudinary
   v                    v
Base PostgreSQL       Cloudinary
auditflow             dossier auditflow
```

Le frontend ne se connecte jamais directement à PostgreSQL. Il envoie une requête HTTP au backend. Le backend vérifie la requête, interroge PostgreSQL avec Drizzle, puis renvoie une réponse JSON.

## 4. Organisation du backend

```text
backend_gestion_mission_audit/
|-- drizzle/                 # migrations SQL générées par Drizzle
|-- legacy/                  # ancienne version json-server (archive inutilisée)
|   |-- server.js
|   |-- db.json
|   `-- README.md
|-- src/
|   |-- config/
|   |   `-- cloudinary.js   # configuration et upload Cloudinary
|   |-- db/
|   |   |-- client.js        # connexion à PostgreSQL
|   |   |-- schema.js        # définition des tables
|   |   `-- seed.js          # données de démonstration
|   |-- middlewares/
|   |   `-- auth.js          # vérification du JWT et des rôles
|   |-- services/
|   |   |-- auth.js
|   |   |-- utilisateurs.js
|   |   |-- clients.js
|   |   |-- missions.js
|   |   |-- documents.js
|   |   `-- journal.js
|   |-- index.js             # démarrage de Hono et traitements des routes
|   |-- routes.js            # description Swagger des routes
|   |-- schemas.js           # validation Zod des données
|   `-- utils.js             # petites fonctions partagées
|-- test/
|   `-- api.test.js          # tests d'intégration de l'API
|-- .env.example             # exemple de configuration
|-- drizzle.config.js        # configuration de Drizzle Kit
|-- package.json             # dépendances et commandes npm
`-- README.md
```

### Rôle des principaux fichiers

#### Anciens fichiers JSON Server

Les fichiers `server.js` et `db.json` appartiennent à la première version du projet réalisée avec `json-server`. 

Ils sont désormais rangés dans le dossier `legacy/` et ne sont plus exécutables : `json-server` a été retiré des dépendances et `server.js` utilise la syntaxe CommonJS, incompatible avec le `"type": "module"` déclaré dans `package.json`.

Les données actuelles sont enregistrées dans PostgreSQL. Le fichier `legacy/db.json` sert uniquement de référence pour retrouver les anciennes données de démonstration.

#### `src/index.js`

Ce fichier :

1. crée l'application Hono ;
2. configure CORS ;
3. protège les routes avec le middleware JWT ;
4. associe chaque route Swagger à son traitement ;
5. gère les erreurs ;
6. publie Swagger ;
7. démarre le serveur.

#### `src/routes.js`

Chaque route est déclarée avec `createRoute`. La déclaration précise :

* la méthode HTTP ;

* le chemin ;

* le groupe Swagger ;

* les paramètres ;

* le corps JSON attendu ;

* les réponses possibles.

#### `src/schemas.js`

Les schémas Zod contrôlent les données avant leur utilisation. Par exemple :

* un email doit avoir un format valide ;

* un téléphone doit contenir 9 chiffres ;

* un identifiant doit être un entier positif ;

* l'avancement d'une mission doit être compris entre 0 et 100 ;

* la date de fin prévue doit être postérieure à la date de début ;

* le rôle et le statut doivent appartenir aux valeurs autorisées.

#### `src/services/`

Les services contiennent les requêtes Drizzle. Le fichier `index.js` s'occupe des règles HTTP et les services s'occupent de la base de données.

## 5. Base de données

La base utilisée s'appelle `auditflow`.

### Tables

#### `clients`

Contient les entreprises clientes : raison sociale, NINEA, adresse, email, téléphone, date de création et statut.

#### `utilisateurs`

Contient les comptes de connexion : nom, prénom, email, mot de passe haché, téléphone, photo, rôle, statut et éventuellement le client associé.

Le mot de passe original n'est jamais enregistré. Seul son hash bcrypt est stocké.

#### `missions`

Contient les informations d'une mission : titre, description, dates, avancement, statut, client et expert-comptable responsable.

#### `mission_auditeurs`

Table d'association entre les missions et les auditeurs. Une mission peut avoir plusieurs auditeurs et un auditeur peut participer à plusieurs missions.

#### `documents`

Contient les informations des documents : titre, nom du fichier, URL Cloudinary, description, taille, mission et utilisateur ayant ajouté le document.

Le frontend envoie le fichier au backend avec `multipart/form-data`. Le backend utilise ensuite le SDK Cloudinary et ses clés privées pour envoyer le fichier. L'URL retournée par Cloudinary est enfin enregistrée avec les informations du document.

#### `journaux_activites`

Contient les actions importantes : connexion, création, modification, suppression et affectation.

### Relations

```text
clients 1 -------- n missions
clients 1 -------- n utilisateurs de rôle client
utilisateurs 1 --- n missions comme expert-comptable
missions n ------- n utilisateurs auditeurs
missions 1 ------- n documents
utilisateurs 1 --- n documents
utilisateurs 1 --- n journaux_activites
```

Le JWT est supprimé du navigateur lors de la déconnexion et expire automatiquement après 24 heures.

## 6. Prérequis

Installer avant de démarrer :

* Node.js ;

* npm ;

* PostgreSQL ;

* un terminal PowerShell ou un autre terminal compatible.

Vérification :

```powershell
node --version
npm --version
psql --version
```

## 7. Création de la base PostgreSQL

Ouvrir SQL Shell (`psql`) ou un terminal :

```powershell
psql -U postgres -d postgres
```

Saisir le mot de passe PostgreSQL puis exécuter :

```sql
CREATE DATABASE auditflow;
```

Quitter `psql` :

```text
\q
```

La base peut aussi être créée avec :

```powershell
createdb -U postgres auditflow
```

## 8. Configuration du backend

Se placer dans le dossier du backend :

```powershell
cd backend_gestion_mission_audit
```

Copier le fichier d'exemple :

```powershell
Copy-Item .env.example .env
```

Contenu attendu dans `.env` :

```env
PORT=3002
DATABASE_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/auditflow
JWT_SECRET=une-cle-secrete-longue-et-difficile-a-deviner
FRONTEND_ORIGIN=http://localhost:5500
CLOUDINARY_CLOUD_NAME=nom_du_cloud
CLOUDINARY_API_KEY=cle_api
CLOUDINARY_API_SECRET=secret_api
```

Description :

| Variable          | Utilité                                      |
| ----------------- | -------------------------------------------- |
| `PORT`            | Port utilisé par Hono                        |
| `DATABASE_URL`    | Adresse de connexion à PostgreSQL            |
| `JWT_SECRET`      | Clé utilisée pour signer et vérifier les JWT |
| `FRONTEND_ORIGIN` | Adresse frontend autorisée par CORS          |
| `CLOUDINARY_CLOUD_NAME` | Nom du compte Cloudinary              |
| `CLOUDINARY_API_KEY` | Clé publique de l'API Cloudinary          |
| `CLOUDINARY_API_SECRET` | Clé privée utilisée uniquement par le backend |

Le fichier `.env` contient des informations sensibles et ne doit pas être envoyé sur GitHub. Il est ignoré par `.gitignore`.

## 9. Installation et initialisation

Installer les dépendances :

```powershell
npm install
```

Appliquer les migrations déjà présentes :

```powershell
npm run db:migrate
```

Insérer les données de démonstration :

```powershell
npm run seed
```

Le seed ne réinsère pas les comptes lorsque la table `utilisateurs` contient déjà des données.

## 10. Lancement de l'application

### Backend

Dans le dossier `backend_gestion_mission_audit` :

```powershell
npm run dev
```

Adresses :

* API : <http://localhost:3002>

* Swagger UI : <http://localhost:3002/ui>

* document OpenAPI JSON : <http://localhost:3002/doc>

### Frontend

Dans un deuxième terminal, se placer dans le dossier du frontend et servir les fichiers sur le port 5500 :

```powershell
cd ..\frontend_gestion_mission_audit
npx serve -l 5500
```

L'extension **Live Server** de VS Code, réglée sur le port 5500, convient également.

Ouvrir ensuite :

* application : <http://localhost:5500>

Il ne faut pas ouvrir `index.html` avec une adresse `file:///...`. Le serveur HTTP est nécessaire pour les modules JavaScript et CORS.

## 11. Comptes de démonstration

| Rôle             | Email                 | Mot de passe   |
| ---------------- | --------------------- | -------------- |
| Administrateur   | `admin1@gmail.com`    | `admin1123`    |
| Expert-comptable | `expert@gmail.com`    | `expert123`    |
| Auditeur         | `auditeur1@gmail.com` | `auditeur1123` |
| Auditeur         | `auditeur2@gmail.com` | `auditeur2123` |

<br />

## 12. Authentification JWT

### Étape 1 : connexion

Le frontend envoie :

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "admin1@gmail.com",
  "mot_de_passe": "admin1123"
}
```

Le backend :

1. recherche l'utilisateur par email ;
2. vérifie que le compte est actif ;
3. compare le mot de passe avec bcrypt ;
4. crée un JWT valable 24 heures ;
5. renvoie le token et l'utilisateur sans son mot de passe.

Exemple de réponse :

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "utilisateur": {
    "id": 1,
    "nom": "Diagne",
    "prenom": "Ndeye",
    "email": "admin1@gmail.com",
    "role": "administrateur",
    "statut": "actif"
  }
}
```

### Étape 2 : conservation du token

Le frontend conserve les informations dans `localStorage` :

```js
localStorage.setItem('auditflow_token', token);
localStorage.setItem('auditflow_user', JSON.stringify(utilisateur));
```

### Étape 3 : requêtes protégées

Le token est envoyé dans l'en-tête :

```http
Authorization: Bearer VOTRE_TOKEN
```

Le middleware vérifie la signature, l'expiration du JWT, l'existence de l'utilisateur et son statut actif.

### Étape 4 : déconnexion

Le frontend appelle `/auth/logout`, supprime le token de `localStorage`, puis recharge la page de connexion.

<br />

## 13. Rôles et autorisations

### Administrateur

* consulte et gère les utilisateurs ;

* consulte et gère les clients ;

* consulte et gère les missions ;

* consulte les documents ;

* consulte le journal d'activité.

### Expert-comptable

* consulte les clients ;

* crée et modifie les clients ;

* crée et suit les missions ;

* affecte les auditeurs ;

* consulte et gère les documents de ses missions ;

* peut créer un compte utilisateur de rôle client.

### Auditeur

* voit uniquement les missions auxquelles il est affecté ;

* met à jour l'avancement et le statut de ses missions, et rien d'autre ;

* consulte et ajoute les documents de ses missions ;

* ne voit que les clients concernés par ses missions.

### Client

* voit uniquement les missions liées à son compte ;

* ne peut pas modifier les missions ;

* ne voit que sa propre fiche client.

### Cloisonnement appliqué par le backend

Les restrictions ne dépendent pas du frontend : elles sont appliquées par l'API.

| Ressource            | Administrateur | Expert-comptable            | Auditeur                        | Client              |
| -------------------- | -------------- | --------------------------- | ------------------------------- | ------------------- |
| `/utilisateurs`      | tout           | tout                        | annuaire réduit                 | annuaire réduit     |
| `/clients`           | tout           | tout                        | clients de ses missions         | son client          |
| `/missions`          | tout           | les siennes                 | celles où il est affecté        | celles de son client |
| `/documents`         | tout           | ceux de ses missions        | ceux de ses missions            | aucun ajout         |
| `/journaux_activites` | tout          | interdit                    | interdit                        | interdit            |

L'annuaire réduit ne contient que `id`, `nom`, `prenom`, `photo` et `role` : de quoi afficher le nom d'un collègue sur une mission, sans divulguer les emails et les téléphones de tout le cabinet. Chaque utilisateur reçoit toujours sa propre fiche complète.

La suppression d'une mission et l'affectation des auditeurs sont réservées à l'administrateur et à l'expert-comptable **responsable de cette mission**.

## 14. Routes de l'API

Toutes les routes sauf `/auth/login`, `/`, `/ui` et `/doc` nécessitent un JWT.

### Authentification

| Méthode | Route          | Description                 |
| ------- | -------------- | --------------------------- |
| `POST`  | `/auth/login`  | Se connecter                |
| `POST`  | `/auth/logout` | Se déconnecter              |
| `GET`   | `/auth/me`     | Afficher le profil connecté |

### Utilisateurs

| Méthode  | Route                | Description              |
| -------- | -------------------- | ------------------------ |
| `GET`    | `/utilisateurs`      | Lister les utilisateurs  |
| `POST`   | `/utilisateurs`      | Créer un utilisateur     |
| `GET`    | `/utilisateurs/{id}` | Afficher un utilisateur  |
| `PATCH`  | `/utilisateurs/{id}` | Modifier un utilisateur  |
| `DELETE` | `/utilisateurs/{id}` | Supprimer un utilisateur |

### Clients

| Méthode  | Route           | Description         |
| -------- | --------------- | ------------------- |
| `GET`    | `/clients`      | Lister les clients  |
| `POST`   | `/clients`      | Créer un client     |
| `GET`    | `/clients/{id}` | Afficher un client  |
| `PATCH`  | `/clients/{id}` | Modifier un client  |
| `DELETE` | `/clients/{id}` | Supprimer un client |

### Missions

| Méthode  | Route                      | Description                  |
| -------- | -------------------------- | ---------------------------- |
| `GET`    | `/missions`                | Lister les missions visibles |
| `POST`   | `/missions`                | Créer une mission            |
| `GET`    | `/missions/{id}`           | Afficher une mission         |
| `PATCH`  | `/missions/{id}`           | Modifier une mission         |
| `DELETE` | `/missions/{id}`           | Supprimer une mission        |
| `PATCH`  | `/missions/{id}/auditeurs` | Affecter les auditeurs       |

`GET /missions` accepte deux filtres facultatifs, appliqués directement en SQL :

| Paramètre  | Exemple                        | Effet                       |
| ---------- | ------------------------------ | --------------------------- |
| `statut`   | `/missions?statut=en_cours`    | filtre sur le statut        |
| `clientId` | `/missions?clientId=1`         | filtre sur le client        |

Les filtres s'appliquent **après** les droits : ils réduisent la liste visible, ils ne l'élargissent jamais.

### Documents

| Méthode  | Route             | Description                            |
| -------- | ----------------- | -------------------------------------- |
| `GET`    | `/documents`      | Lister les documents visibles          |
| `POST`   | `/documents`      | Ajouter les informations d'un document |
| `GET`    | `/documents/{id}` | Afficher un document                   |
| `DELETE` | `/documents/{id}` | Supprimer un document                  |

`GET /documents` accepte le filtre facultatif `missionId` : `/documents?missionId=1`.

### Upload Cloudinary

| Méthode | Route | Description |
| ------- | ----- | ----------- |
| `POST` | `/uploads` | Envoyer une image ou un document vers Cloudinary |

La route `/uploads` attend un formulaire `multipart/form-data` contenant le champ `fichier`. Elle accepte les fichiers jusqu'à 10 Mo et nécessite un JWT.

### Journal

| Méthode | Route                 | Description                                   |
| ------- | --------------------- | --------------------------------------------- |
| `GET`   | `/journaux_activites` | Lister le journal, réservé à l'administrateur |

## 15. Tester avec Swagger

1. Démarrer le backend.
2. Ouvrir <http://localhost:3002/ui>.
3. Ouvrir `POST /auth/login`.
4. Cliquer sur **Try it out**.
5. Saisir l'email et le mot de passe.
6. Exécuter la requête.
7. Copier la valeur `token` de la réponse.
8. Cliquer sur **Authorize** en haut de Swagger.
9. Coller uniquement le token ou la valeur demandée par Swagger.
10. Tester les autres routes.

## 16. Communication avec le frontend

Le frontend connaît l'adresse du backend grâce à :

```js
export const API_BASE_URL = 'http://localhost:3002';
```

Exemple de lecture :

```js
const response = await fetch('http://localhost:3002/missions', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const missions = await response.json();
```

Exemple de création :

```js
const response = await fetch('http://localhost:3002/clients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(client),
});
```

Exemple d'envoi d'un fichier vers Cloudinary par le backend :

```js
const formData = new FormData();
formData.append('fichier', fichier);

const response = await fetch('http://localhost:3002/uploads', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});

const upload = await response.json();
console.log(upload.url);
```

Il ne faut pas ajouter manuellement `Content-Type` pour un `FormData`. Le navigateur construit automatiquement la limite `multipart/form-data`.

CORS autorise seulement l'origine indiquée par `FRONTEND_ORIGIN`. Il faut donc utiliser la même adresse dans le navigateur et dans `.env`.

## 17. Codes HTTP utilisés

| Code  | Signification                                         |
| ----- | ----------------------------------------------------- |
| `200` | Requête réussie                                       |
| `201` | Ressource créée                                       |
| `400` | Données invalides, corps de `PATCH` sans champ modifiable, dates incohérentes |
| `401` | Token absent, invalide ou expiré                      |
| `403` | Utilisateur connecté mais rôle insuffisant            |
| `404` | Ressource ou route introuvable                        |
| `409` | Conflit, doublon ou relation empêchant la suppression |
| `500` | Erreur interne du serveur                             |

## 18. Commandes npm

| Commande              | Description                                       |
| --------------------- | ------------------------------------------------- |
| `npm run dev`         | Démarre le backend avec redémarrage automatique   |
| `npm start`           | Démarre le backend normalement                    |
| `npm run db:generate` | Génère une migration après modification du schéma |
| `npm run db:migrate`  | Applique les migrations à PostgreSQL              |
| `npm run db:studio`   | Ouvre l'interface Drizzle Studio                  |
| `npm run seed`        | Insère les données de démonstration               |
| `npm test`            | Lance les tests d'intégration de l'API            |

### Tests

`npm test` crée une base PostgreSQL temporaire `auditflow_test` à partir de la connexion indiquée par `DATABASE_URL`, y applique les migrations, insère un jeu de données, exécute les tests, puis supprime cette base.

La base de développement `auditflow` n'est jamais modifiée par les tests.

Les tests vérifient notamment le cloisonnement par rôle, la cohérence des dates d'une mission, le changement de mot de passe et les filtres de liste.

### Modifier la structure d'une table

Après une modification dans `src/db/schema.js` :

```powershell
npm run db:generate
npm run db:migrate
```

Il ne faut pas modifier manuellement une migration déjà appliquée.

## 19. Problèmes fréquents

### `ECONNREFUSED` ou backend inaccessible

* vérifier que le backend est démarré ;

* vérifier le port `3002` ;

* vérifier `API_BASE_URL` dans le frontend.

### Erreur de connexion PostgreSQL

* vérifier que PostgreSQL est démarré ;

* vérifier le nom de la base ;

* vérifier l'utilisateur et le mot de passe dans `DATABASE_URL`.

Test de la connexion :

```powershell
psql -U postgres -d auditflow -c "SELECT count(*) FROM utilisateurs;"
```

Depuis le 401 renvoyé par `/auth/login`, une base injoignable n'est plus déguisée en « email ou mot de passe incorrect » : elle produit une erreur `500` et la cause exacte s'affiche dans le terminal du backend.

### Erreur CORS

Vérifier que les deux valeurs correspondent :

```env
FRONTEND_ORIGIN=http://localhost:5500
```

```text
http://localhost:5500
```

Éviter de mélanger `localhost` et `127.0.0.1`, car le navigateur les considère comme deux origines différentes.

### `401 Unauthorized`

* se reconnecter ;

* vérifier que le token est présent dans `localStorage` ;

* vérifier l'en-tête `Authorization: Bearer ...` ;

* vérifier que le compte est actif.

### Port déjà utilisé

Le projet de gestion de stock peut déjà utiliser le port `3000`. AuditFlow utilise donc le port `3002`.

Pour voir les ports utilisés sous Windows :

```powershell
netstat -ano | Select-String ':3002|:5500'
```

## 20. Sécurité appliquée

* mots de passe hachés avec bcrypt ;

* mots de passe exclus des réponses JSON ;

* JWT signé avec `JWT_SECRET` ;

* expiration des JWT après 24 heures ;

* contrôle du statut actif ;

* contrôle des rôles côté backend ;

* validation Zod ;

* contraintes uniques PostgreSQL ;

* relations par clés étrangères ;

* fichier `.env` ignoré par Git.

* clés Cloudinary conservées uniquement dans le backend ;

* limite de 10 Mo appliquée avant l'envoi vers Cloudinary ;

* cloisonnement des listes : un auditeur ou un client ne reçoit ni les coordonnées de tout le cabinet, ni les fiches des autres entreprises auditées ;

* suppression d'une mission et affectation des auditeurs réservées à son responsable ;

* changement de son propre mot de passe conditionné à la saisie de l'ancien.

### Limites connues

**La déconnexion n'invalide pas le jeton côté serveur.** `POST /auth/logout` confirme la déconnexion et le frontend efface le jeton du navigateur, mais un jeton déjà émis reste techniquement valable jusqu'à son expiration, au bout de 24 heures. Une révocation réelle demanderait de conserver les jetons annulés dans une table dédiée et de la consulter à chaque requête.

**Aucune limitation du nombre de tentatives de connexion.** Rien n'empêche aujourd'hui d'essayer un grand nombre de mots de passe sur `/auth/login`.

**Le type des fichiers téléversés n'est pas contrôlé**, seule leur taille l'est.

Pour une application réellement déployée, il faudrait également utiliser HTTPS, raccourcir la durée du JWT et traiter les trois points ci-dessus.

## 21. Résumé du fonctionnement complet

1. PostgreSQL démarre et contient la base `auditflow`.
2. Le backend lit `.env`.
3. Hono démarre sur le port `3002`.
4. Le frontend démarre sur le port `5500`.
5. L'utilisateur saisit son email et son mot de passe.
6. Le backend vérifie le mot de passe avec bcrypt.
7. Le backend renvoie un JWT.
8. Le frontend conserve le JWT.
9. Chaque requête protégée envoie le JWT.
10. Le middleware vérifie le JWT et charge l'utilisateur.
11. La route vérifie son rôle et les données Zod.
12. Le service exécute la requête Drizzle.
13. PostgreSQL renvoie les données.
14. Le backend renvoie une réponse JSON.
15. Pour un fichier, le frontend appelle `/uploads` avec `FormData`.
16. Le backend envoie le fichier vers le dossier `auditflow` de Cloudinary.
17. Cloudinary retourne une URL sécurisée au backend.
18. Le backend renvoie cette URL au frontend.
19. Le frontend enregistre ensuite les informations du document.
20. Le frontend affiche le résultat dans l'interface.

***

Application : <http://localhost:5500>\
API : <http://localhost:3002>\
Swagger : <http://localhost:3002/ui>
