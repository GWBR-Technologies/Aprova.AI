CREATE SCHEMA "read";
--> statement-breakpoint
CREATE SCHEMA "write";
--> statement-breakpoint
CREATE TABLE "write"."ai_usage" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"essay_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"cached_input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cost_usd" numeric(12, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "write"."command_log" (
	"user_id" uuid NOT NULL,
	"command_id" uuid NOT NULL,
	"command_type" text NOT NULL,
	"payload_hash" "bytea" NOT NULL,
	"response" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "command_log_user_id_command_id_pk" PRIMARY KEY("user_id","command_id")
);
--> statement-breakpoint
CREATE TABLE "write"."entitlements" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"plan" text NOT NULL,
	"valid_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlements_plan_check" CHECK ("write"."entitlements"."plan" IN ('FREE', 'PREMIUM'))
);
--> statement-breakpoint
CREATE TABLE "write"."essay_quota" (
	"user_id" uuid NOT NULL,
	"period" text NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "essay_quota_user_id_period_pk" PRIMARY KEY("user_id","period"),
	CONSTRAINT "essay_quota_used_check" CHECK ("write"."essay_quota"."used" >= 0)
);
--> statement-breakpoint
CREATE TABLE "read"."essay_view" (
	"essay_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"result" jsonb,
	"failure_code" text,
	"aggregate_version" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"as_of" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "write"."essays" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"command_id" uuid NOT NULL,
	"text" text NOT NULL,
	"status" text NOT NULL,
	"quota_period" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"result" jsonb,
	"prompt_version" text,
	"model" text,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "essays_status_check" CHECK ("write"."essays"."status" IN ('processing', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "read"."mock_exam_view" (
	"mock_exam_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"result" jsonb,
	"aggregate_version" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"as_of" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "write"."mock_exams" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"command_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mock_exams_status_check" CHECK ("write"."mock_exams"."status" IN ('processing', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "write"."outbox" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"correlation_id" uuid NOT NULL,
	"envelope" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	CONSTRAINT "outbox_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "read"."performance_summary" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"as_of" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "write"."processed_events" (
	"consumer" text NOT NULL,
	"event_id" uuid NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "processed_events_consumer_event_id_pk" PRIMARY KEY("consumer","event_id")
);
--> statement-breakpoint
CREATE TABLE "write"."question_answers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"command_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"answered_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "write"."refresh_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "write"."routine_progress" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"command_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "write"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_sub" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_provider_provider_sub_unique" UNIQUE("provider","provider_sub"),
	CONSTRAINT "users_provider_check" CHECK ("write"."users"."provider" IN ('google', 'apple'))
);
--> statement-breakpoint
ALTER TABLE "write"."entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "write"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "write"."essays" ADD CONSTRAINT "essays_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "write"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "write"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "write"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "essay_view_user" ON "read"."essay_view" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "essays_user_created" ON "write"."essays" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mock_exam_view_user" ON "read"."mock_exam_view" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "outbox_pending" ON "write"."outbox" USING btree ("id") WHERE "write"."outbox"."published_at" IS NULL;