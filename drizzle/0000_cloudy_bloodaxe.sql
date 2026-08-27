CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"raison_sociale" text NOT NULL,
	"ninea" text NOT NULL,
	"adresse" text NOT NULL,
	"email" text,
	"telephone" text NOT NULL,
	"date_creation" date DEFAULT now() NOT NULL,
	"statut" text DEFAULT 'actif' NOT NULL,
	CONSTRAINT "clients_ninea_unique" UNIQUE("ninea"),
	CONSTRAINT "clients_email_unique" UNIQUE("email"),
	CONSTRAINT "clients_telephone_unique" UNIQUE("telephone")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"nom_fichier" text NOT NULL,
	"chemin" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"date_upload" date DEFAULT now() NOT NULL,
	"taille" integer,
	"mission_id" integer NOT NULL,
	"utilisateur_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journaux_activites" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"date_action" timestamp DEFAULT now() NOT NULL,
	"utilisateur_id" integer
);
--> statement-breakpoint
CREATE TABLE "mission_auditeurs" (
	"mission_id" integer NOT NULL,
	"auditeur_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" serial PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"date_debut" date NOT NULL,
	"date_fin_prevue" date NOT NULL,
	"date_fin_reelle" date,
	"avancement" integer DEFAULT 0 NOT NULL,
	"statut" text DEFAULT 'en_cours' NOT NULL,
	"date_creation" date DEFAULT now() NOT NULL,
	"client_id" integer NOT NULL,
	"expert_comptable_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens_revoques" (
	"jti" text PRIMARY KEY NOT NULL,
	"expire_le" timestamp NOT NULL,
	"revoque_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utilisateurs" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"prenom" text NOT NULL,
	"email" text NOT NULL,
	"mot_de_passe" text NOT NULL,
	"telephone" text NOT NULL,
	"photo" text DEFAULT '' NOT NULL,
	"date_creation" date DEFAULT now() NOT NULL,
	"role" text NOT NULL,
	"statut" text DEFAULT 'actif' NOT NULL,
	"client_id" integer,
	CONSTRAINT "utilisateurs_email_unique" UNIQUE("email"),
	CONSTRAINT "utilisateurs_telephone_unique" UNIQUE("telephone")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journaux_activites" ADD CONSTRAINT "journaux_activites_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_auditeurs" ADD CONSTRAINT "mission_auditeurs_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_auditeurs" ADD CONSTRAINT "mission_auditeurs_auditeur_id_utilisateurs_id_fk" FOREIGN KEY ("auditeur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_expert_comptable_id_utilisateurs_id_fk" FOREIGN KEY ("expert_comptable_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mission_auditeur_unique" ON "mission_auditeurs" USING btree ("mission_id","auditeur_id");