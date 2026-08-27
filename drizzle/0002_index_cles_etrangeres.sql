CREATE INDEX "documents_mission_id_index" ON "documents" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "documents_utilisateur_id_index" ON "documents" USING btree ("utilisateur_id");--> statement-breakpoint
CREATE INDEX "journaux_activites_date_action_index" ON "journaux_activites" USING btree ("date_action");--> statement-breakpoint
CREATE INDEX "mission_auditeurs_auditeur_id_index" ON "mission_auditeurs" USING btree ("auditeur_id");--> statement-breakpoint
CREATE INDEX "missions_client_id_index" ON "missions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "missions_expert_comptable_id_index" ON "missions" USING btree ("expert_comptable_id");--> statement-breakpoint
CREATE INDEX "missions_statut_index" ON "missions" USING btree ("statut");--> statement-breakpoint
CREATE INDEX "utilisateurs_client_id_index" ON "utilisateurs" USING btree ("client_id");