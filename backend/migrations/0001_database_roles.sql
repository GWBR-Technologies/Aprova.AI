-- Papéis de grupo com menor privilégio (§16 do guia de implementação do back-end).
-- São NOLOGIN: os usuários de login e as senhas são criados pela operação (guia de DevOps) e
-- recebem um destes papéis com GRANT. A migração roda com o papel dono dos esquemas.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aprova_api') THEN
    CREATE ROLE aprova_api NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aprova_worker') THEN
    CREATE ROLE aprova_worker NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "write", "read" TO aprova_api, aprova_worker;
--> statement-breakpoint
-- API e relay: gravam em write (comandos, outbox, autenticação) e só leem read.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "write" TO aprova_api;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "write" TO aprova_api;
--> statement-breakpoint
GRANT SELECT ON ALL TABLES IN SCHEMA "read" TO aprova_api;
--> statement-breakpoint
-- Workers: gravam em write (resultados, outbox, processed_events, ai_usage) e em read (projeções).
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA "write" TO aprova_worker;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "write" TO aprova_worker;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "read" TO aprova_worker;
--> statement-breakpoint
-- Tabelas criadas por migrações futuras herdam as mesmas permissões.
ALTER DEFAULT PRIVILEGES IN SCHEMA "write" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aprova_api;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "write" GRANT USAGE, SELECT ON SEQUENCES TO aprova_api, aprova_worker;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "write" GRANT SELECT, INSERT, UPDATE ON TABLES TO aprova_worker;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "read" GRANT SELECT ON TABLES TO aprova_api;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "read" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aprova_worker;
