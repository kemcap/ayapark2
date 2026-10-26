-- Isolated test fixture, captured 2026-10-25 before the legacy-read hardening. Never apply to production.
-- No real account/person/financial rows. Auth is a minimal synthetic substitute.
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA ay2_private; CREATE SCHEMA extensions;
CREATE TABLE auth.users(id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb DEFAULT '{}', raw_app_meta_data jsonb DEFAULT '{}');
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
GRANT USAGE ON SCHEMA ay2_private TO authenticated;
CREATE OR REPLACE FUNCTION auth.jwt()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$function$
;
CREATE OR REPLACE FUNCTION auth.role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$function$
;
CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$
;
CREATE TABLE public."ay3_occupancy_changes" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"unit_id" uuid NOT NULL,"effective_on" date NOT NULL,"status" text NOT NULL,"created_by" uuid NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."ay3_user_preferences" ("user_id" uuid NOT NULL,"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,"updated_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."ay3_review_receipts" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"unit_id" uuid NOT NULL,"kind" text NOT NULL,"source_id" uuid NOT NULL,"fingerprint" text NOT NULL,"actor" uuid NOT NULL,"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."ayapark_admins" ("user_id" uuid NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."ayapark_claims" ("id" text NOT NULL,"sort_order" integer NOT NULL,"amount" numeric(12,2) NOT NULL,"person_kind" text NOT NULL,"followup_kind" text NOT NULL,"is_paid" boolean DEFAULT false NOT NULL,"message_sent" boolean DEFAULT false NOT NULL,"updated_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."ayapark_private" ("id" text NOT NULL,"full_name" text NOT NULL,"unit" text NOT NULL,"note" text DEFAULT ''::text NOT NULL,"identity_note" text DEFAULT ''::text NOT NULL,"pre_note" text DEFAULT ''::text NOT NULL,"needs_verification" boolean DEFAULT false NOT NULL,"updated_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."site_sites" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"slug" text NOT NULL,"name" text NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."site_blocks" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"code" text NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."site_units" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"block_id" uuid NOT NULL,"number" integer NOT NULL,"code" text NOT NULL,"occupancy_status" text DEFAULT 'unknown'::text NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL,"updated_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."site_staff_memberships" ("site_id" uuid NOT NULL,"user_id" uuid NOT NULL,"role" text NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."site_resident_units" ("unit_id" uuid NOT NULL,"user_id" uuid NOT NULL,"role" text NOT NULL,"active" boolean DEFAULT true NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL,"person_id" uuid);
CREATE TABLE public."site_people" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"full_name" text NOT NULL,"phone" text DEFAULT ''::text NOT NULL,"email" text DEFAULT ''::text NOT NULL,"admin_note" text DEFAULT ''::text NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL,"updated_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."site_unit_people" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"unit_id" uuid NOT NULL,"person_id" uuid NOT NULL,"relation" text NOT NULL,"is_current" boolean DEFAULT true NOT NULL,"started_on" date,"ended_on" date,"created_at" timestamp with time zone DEFAULT now() NOT NULL,"updated_at" timestamp with time zone DEFAULT now() NOT NULL,"archived_at" timestamp with time zone,"archived_by" uuid,"archive_reason" text);
CREATE TABLE public."site_audit_events" ("id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,"site_id" uuid NOT NULL,"unit_id" uuid,"person_id" uuid,"actor_user_id" uuid,"actor_email" text,"event_type" text NOT NULL,"changed_fields" text[] DEFAULT '{}'::text[] NOT NULL,"details" jsonb DEFAULT '{}'::jsonb NOT NULL,"happened_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL);
CREATE TABLE public."site_audit_view_settings" ("site_id" uuid NOT NULL,"hidden_through_id" bigint DEFAULT 0 NOT NULL,"reset_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,"reset_by" uuid,"reason" text DEFAULT 'Yönetim talebiyle yeni dönem'::text NOT NULL);
CREATE TABLE public."ay2_settings" ("site_id" uuid NOT NULL,"opening_cents" bigint DEFAULT 0 NOT NULL,"opening_date" date DEFAULT '2022-01-01'::date NOT NULL,"initialized" boolean DEFAULT false NOT NULL);
CREATE TABLE public."ay2_permissions" ("site_id" uuid NOT NULL,"user_id" uuid NOT NULL,"capabilities" text[] DEFAULT '{}'::text[] NOT NULL);
CREATE TABLE public."ay2_batches" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"source_name" text NOT NULL,"digest" text NOT NULL,"row_count" integer NOT NULL,"created_by" uuid NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."ay2_allocations" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"entry_id" uuid NOT NULL,"charge_id" uuid NOT NULL,"request_id" uuid NOT NULL,"cents" bigint NOT NULL,"void_reason" text,"created_by" uuid NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."ay2_people" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"unit_id" uuid NOT NULL,"full_name" text NOT NULL,"relation" text NOT NULL,"email" text DEFAULT ''::text NOT NULL,"phone" text DEFAULT ''::text NOT NULL,"active" boolean DEFAULT true NOT NULL);
CREATE TABLE public."ay2_reports" ("site_id" uuid NOT NULL,"period" date NOT NULL,"opening_cents" bigint NOT NULL,"income_cents" bigint NOT NULL,"expense_cents" bigint NOT NULL,"closing_cents" bigint NOT NULL,"source_last_date" date,"published_at" timestamp with time zone DEFAULT now() NOT NULL,"published_by" uuid NOT NULL);
CREATE TABLE public."ay2_audit" ("id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,"site_id" uuid NOT NULL,"actor" uuid NOT NULL,"action" text NOT NULL,"entity_id" uuid,"details" jsonb DEFAULT '{}'::jsonb NOT NULL,"at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."ay2_staged_charges" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"source" text NOT NULL,"source_key" text NOT NULL,"person_label" text NOT NULL,"unit_hint" text DEFAULT ''::text NOT NULL,"cents" bigint NOT NULL,"as_of" date NOT NULL,"kind" text DEFAULT 'balance'::text NOT NULL,"confirmed_charge" uuid,"ignored_reason" text);
CREATE TABLE public."ay2_charges" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"unit_id" uuid NOT NULL,"category" text NOT NULL,"label" text NOT NULL,"due_on" date NOT NULL,"cents" bigint NOT NULL,"payer" text NOT NULL,"reference" text NOT NULL,"void_reason" text,"created_by" uuid NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL,"person_id" uuid,"link_id" uuid,"period_from" date,"period_to" date);
CREATE TABLE public."ay2_entries" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"booked_on" date NOT NULL,"description" text NOT NULL,"category" text DEFAULT 'Diğer'::text NOT NULL,"cents" bigint NOT NULL,"bank_reference" text DEFAULT ''::text NOT NULL,"dedup_key" text NOT NULL,"batch_id" uuid,"reversal_of" uuid,"created_by" uuid NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL,"sender_name" text DEFAULT ''::text NOT NULL,"sender_iban" text DEFAULT ''::text NOT NULL,"unit_hint" text DEFAULT ''::text NOT NULL);
CREATE TABLE public."ay2_announcements" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"title" text NOT NULL,"body" text NOT NULL,"published" boolean DEFAULT false NOT NULL,"created_by" uuid NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL,"priority" text DEFAULT 'normal'::text NOT NULL,"starts_at" timestamp with time zone,"ends_at" timestamp with time zone,"author_label" text DEFAULT 'Yönetim'::text NOT NULL,"updated_by" uuid,"updated_at" timestamp with time zone,"revision" integer DEFAULT 1 NOT NULL);
CREATE TABLE public."ay3_links" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"unit_id" uuid NOT NULL,"person_id" uuid NOT NULL,"role" text NOT NULL,"starts_on" date,"ends_on" date,"responsibility" text DEFAULT ''::text NOT NULL,"primary_contact" boolean DEFAULT false NOT NULL,"active" boolean DEFAULT true NOT NULL,"archived_at" timestamp with time zone,"archive_reason" text,"archive_note" text,"updated_at" timestamp with time zone DEFAULT now() NOT NULL,"revision" bigint DEFAULT 1 NOT NULL);
CREATE TABLE public."ay3_persons" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"full_name" text NOT NULL,"first_name" text DEFAULT ''::text NOT NULL,"last_name" text DEFAULT ''::text NOT NULL,"phone" text DEFAULT ''::text NOT NULL,"email" text DEFAULT ''::text NOT NULL,"language" text DEFAULT 'tr'::text NOT NULL,"notes" text DEFAULT ''::text NOT NULL,"auth_user_id" uuid,"created_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."ay3_credits" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"entry_id" uuid NOT NULL,"unit_id" uuid NOT NULL,"person_id" uuid NOT NULL,"cents" bigint NOT NULL,"request_id" uuid NOT NULL,"created_by" uuid NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL,"void_reason" text);
CREATE TABLE public."ay3_match_rules" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"unit_id" uuid NOT NULL,"person_id" uuid NOT NULL,"alias" text DEFAULT ''::text NOT NULL,"iban" text DEFAULT ''::text NOT NULL,"created_by" uuid NOT NULL);
CREATE TABLE public."ay3_providers" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"name" text NOT NULL,"category" text NOT NULL,"contact" text DEFAULT ''::text NOT NULL,"phone" text DEFAULT ''::text NOT NULL,"email" text DEFAULT ''::text NOT NULL,"status" text DEFAULT 'preferred'::text NOT NULL,"created_by" uuid NOT NULL);
CREATE TABLE public."ay3_provider_notes" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"site_id" uuid NOT NULL,"provider_id" uuid NOT NULL,"body" text NOT NULL,"visit_on" date,"created_by" uuid NOT NULL,"author_label" text NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."ay3_acknowledgements" ("site_id" uuid NOT NULL,"announcement_id" uuid NOT NULL,"user_id" uuid NOT NULL,"revision" integer NOT NULL,"at" timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public."site_people" ADD CONSTRAINT "site_people_phone_check" CHECK ((char_length(phone) <= 48));
ALTER TABLE public."site_people" ADD CONSTRAINT "site_people_email_check" CHECK ((char_length(email) <= 254));
ALTER TABLE public."site_people" ADD CONSTRAINT "site_people_admin_note_check" CHECK ((char_length(admin_note) <= 4000));
ALTER TABLE public."site_people" ADD CONSTRAINT "site_people_pkey" PRIMARY KEY (id);
ALTER TABLE public."site_people" ADD CONSTRAINT "site_people_id_site_id_key" UNIQUE (id, site_id);
ALTER TABLE public."ayapark_claims" ADD CONSTRAINT "ayapark_claims_amount_check" CHECK ((amount >= (0)::numeric));
ALTER TABLE public."ayapark_claims" ADD CONSTRAINT "ayapark_claims_person_kind_check" CHECK ((person_kind = ANY (ARRAY['M'::text, 'K'::text, '?'::text])));
ALTER TABLE public."ayapark_claims" ADD CONSTRAINT "ayapark_claims_followup_kind_check" CHECK ((followup_kind = ANY (ARRAY['general'::text, 'icra'::text])));
ALTER TABLE public."ayapark_claims" ADD CONSTRAINT "ayapark_claims_pkey" PRIMARY KEY (id);
ALTER TABLE public."ayapark_claims" ADD CONSTRAINT "ayapark_claims_sort_order_key" UNIQUE (sort_order);
ALTER TABLE public."ayapark_private" ADD CONSTRAINT "ayapark_private_pkey" PRIMARY KEY (id);
ALTER TABLE public."ayapark_admins" ADD CONSTRAINT "ayapark_admins_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."site_sites" ADD CONSTRAINT "site_sites_slug_check" CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text));
ALTER TABLE public."site_sites" ADD CONSTRAINT "site_sites_pkey" PRIMARY KEY (id);
ALTER TABLE public."site_sites" ADD CONSTRAINT "site_sites_slug_key" UNIQUE (slug);
ALTER TABLE public."site_blocks" ADD CONSTRAINT "site_blocks_code_check" CHECK ((code ~ '^[A-Z0-9]{1,10}$'::text));
ALTER TABLE public."site_blocks" ADD CONSTRAINT "site_blocks_pkey" PRIMARY KEY (id);
ALTER TABLE public."site_blocks" ADD CONSTRAINT "site_blocks_site_id_code_key" UNIQUE (site_id, code);
ALTER TABLE public."site_blocks" ADD CONSTRAINT "site_blocks_id_site_id_key" UNIQUE (id, site_id);
ALTER TABLE public."ay2_staged_charges" ADD CONSTRAINT "ay2_staged_charges_cents_check" CHECK ((cents > 0));
ALTER TABLE public."site_units" ADD CONSTRAINT "site_units_number_check" CHECK (((number >= 1) AND (number <= 999)));
ALTER TABLE public."site_units" ADD CONSTRAINT "site_units_occupancy_status_check" CHECK ((occupancy_status = ANY (ARRAY['unknown'::text, 'occupied'::text, 'vacant'::text])));
ALTER TABLE public."site_units" ADD CONSTRAINT "site_units_pkey" PRIMARY KEY (id);
ALTER TABLE public."site_units" ADD CONSTRAINT "site_units_block_id_number_key" UNIQUE (block_id, number);
ALTER TABLE public."site_units" ADD CONSTRAINT "site_units_site_id_code_key" UNIQUE (site_id, code);
ALTER TABLE public."site_units" ADD CONSTRAINT "site_units_id_site_id_key" UNIQUE (id, site_id);
ALTER TABLE public."site_staff_memberships" ADD CONSTRAINT "site_staff_memberships_role_check" CHECK ((role = ANY (ARRAY['manager'::text, 'deputy'::text, 'auditor'::text])));
ALTER TABLE public."site_staff_memberships" ADD CONSTRAINT "site_staff_memberships_pkey" PRIMARY KEY (site_id, user_id);
ALTER TABLE public."site_resident_units" ADD CONSTRAINT "site_resident_units_pkey" PRIMARY KEY (unit_id, user_id, role);
ALTER TABLE public."site_people" ADD CONSTRAINT "site_people_full_name_check" CHECK (((char_length(btrim(full_name)) >= 2) AND (char_length(btrim(full_name)) <= 180)));
ALTER TABLE public."site_unit_people" ADD CONSTRAINT "site_unit_people_dates_check" CHECK (((started_on IS NULL) OR (ended_on IS NULL) OR (started_on <= ended_on)));
ALTER TABLE public."site_unit_people" ADD CONSTRAINT "site_unit_people_pkey" PRIMARY KEY (id);
ALTER TABLE public."site_unit_people" ADD CONSTRAINT "site_unit_people_unit_id_person_id_relation_key" UNIQUE (unit_id, person_id, relation);
ALTER TABLE public."site_unit_people" ADD CONSTRAINT "site_unit_people_relation_check" CHECK ((relation = ANY (ARRAY['owner'::text, 'tenant'::text])));
ALTER TABLE public."site_resident_units" ADD CONSTRAINT "site_resident_units_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'tenant'::text])));
ALTER TABLE public."site_unit_people" ADD CONSTRAINT "site_archive_reason_length" CHECK (((archive_reason IS NULL) OR (char_length(archive_reason) <= 500)));
ALTER TABLE public."site_audit_events" ADD CONSTRAINT "site_audit_events_pkey" PRIMARY KEY (id);
ALTER TABLE public."site_audit_view_settings" ADD CONSTRAINT "site_audit_view_settings_pkey" PRIMARY KEY (site_id);
ALTER TABLE public."ay2_settings" ADD CONSTRAINT "ay2_settings_opening_cents_check" CHECK ((abs(opening_cents) <= '900000000000'::bigint));
ALTER TABLE public."ay2_settings" ADD CONSTRAINT "ay2_settings_pkey" PRIMARY KEY (site_id);
ALTER TABLE public."ay2_people" ADD CONSTRAINT "ay2_people_relation_check" CHECK ((relation = ANY (ARRAY['owner'::text, 'tenant'::text])));
ALTER TABLE public."ay2_permissions" ADD CONSTRAINT "ay2_permissions_capabilities_check" CHECK ((capabilities <@ ARRAY['finance'::text, 'import'::text, 'people'::text, 'announcements'::text]));
ALTER TABLE public."ay2_permissions" ADD CONSTRAINT "ay2_permissions_pkey" PRIMARY KEY (site_id, user_id);
ALTER TABLE public."ay2_batches" ADD CONSTRAINT "ay2_batches_source_name_check" CHECK (((length(source_name) >= 1) AND (length(source_name) <= 200)));
ALTER TABLE public."ay2_batches" ADD CONSTRAINT "ay2_batches_digest_check" CHECK (((length(digest) >= 1) AND (length(digest) <= 128)));
ALTER TABLE public."ay2_batches" ADD CONSTRAINT "ay2_batches_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay2_batches" ADD CONSTRAINT "ay2_batches_site_id_digest_key" UNIQUE (site_id, digest);
ALTER TABLE public."ay2_batches" ADD CONSTRAINT "ay2_batches_id_site_id_key" UNIQUE (id, site_id);
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_description_check" CHECK (((length(description) >= 1) AND (length(description) <= 500)));
ALTER TABLE public."ay2_charges" ADD CONSTRAINT "ay2_charges_cents_check" CHECK (((cents > 0) AND (cents <= '900000000000'::bigint)));
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_category_check" CHECK (((length(category) >= 1) AND (length(category) <= 80)));
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_cents_check" CHECK (((cents <> 0) AND (abs(cents) <= '900000000000'::bigint)));
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_bank_reference_check" CHECK ((length(bank_reference) <= 100));
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_site_id_dedup_key_key" UNIQUE (site_id, dedup_key);
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_id_site_id_key" UNIQUE (id, site_id);
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_reversal_of_key" UNIQUE (reversal_of);
ALTER TABLE public."ay2_charges" ADD CONSTRAINT "ay2_charges_category_check" CHECK (((length(category) >= 1) AND (length(category) <= 80)));
ALTER TABLE public."ay2_charges" ADD CONSTRAINT "ay2_charges_label_check" CHECK (((length(label) >= 1) AND (length(label) <= 200)));
ALTER TABLE public."ay2_charges" ADD CONSTRAINT "ay2_charges_payer_check" CHECK ((payer = ANY (ARRAY['owner'::text, 'tenant'::text, 'review'::text])));
ALTER TABLE public."ay2_charges" ADD CONSTRAINT "ay2_charges_reference_check" CHECK (((length(reference) >= 1) AND (length(reference) <= 150)));
ALTER TABLE public."ay2_charges" ADD CONSTRAINT "ay2_charges_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay2_charges" ADD CONSTRAINT "ay2_charges_site_id_unit_id_reference_key" UNIQUE (site_id, unit_id, reference);
ALTER TABLE public."ay2_charges" ADD CONSTRAINT "ay2_charges_id_site_id_key" UNIQUE (id, site_id);
ALTER TABLE public."ay2_allocations" ADD CONSTRAINT "ay2_allocations_cents_check" CHECK (((cents > 0) AND (cents <= '900000000000'::bigint)));
ALTER TABLE public."ay2_allocations" ADD CONSTRAINT "ay2_allocations_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay2_allocations" ADD CONSTRAINT "ay2_allocations_site_id_request_id_key" UNIQUE (site_id, request_id);
ALTER TABLE public."ay2_people" ADD CONSTRAINT "ay2_people_full_name_check" CHECK (((length(full_name) >= 1) AND (length(full_name) <= 150)));
ALTER TABLE public."ay2_people" ADD CONSTRAINT "ay2_people_email_check" CHECK ((length(email) <= 254));
ALTER TABLE public."ay2_people" ADD CONSTRAINT "ay2_people_phone_check" CHECK ((length(phone) <= 60));
ALTER TABLE public."ay2_people" ADD CONSTRAINT "ay2_people_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay2_people" ADD CONSTRAINT "ay2_people_id_site_id_key" UNIQUE (id, site_id);
ALTER TABLE public."ay2_announcements" ADD CONSTRAINT "ay2_announcements_title_check" CHECK (((length(title) >= 1) AND (length(title) <= 150)));
ALTER TABLE public."ay2_announcements" ADD CONSTRAINT "ay2_announcements_body_check" CHECK (((length(body) >= 1) AND (length(body) <= 5000)));
ALTER TABLE public."ay2_announcements" ADD CONSTRAINT "ay2_announcements_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay2_reports" ADD CONSTRAINT "ay2_reports_period_check" CHECK ((EXTRACT(day FROM period) = (1)::numeric));
ALTER TABLE public."ay2_reports" ADD CONSTRAINT "ay2_reports_check" CHECK ((closing_cents = ((opening_cents + income_cents) - expense_cents)));
ALTER TABLE public."ay2_reports" ADD CONSTRAINT "ay2_reports_pkey" PRIMARY KEY (site_id, period);
ALTER TABLE public."ay2_audit" ADD CONSTRAINT "ay2_audit_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay2_staged_charges" ADD CONSTRAINT "ay2_staged_charges_kind_check" CHECK ((kind = ANY (ARRAY['balance'::text, 'enforcement'::text])));
ALTER TABLE public."ay2_staged_charges" ADD CONSTRAINT "ay2_staged_charges_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay2_staged_charges" ADD CONSTRAINT "ay2_staged_charges_site_id_source_key_key" UNIQUE (site_id, source_key);
ALTER TABLE public."ay3_persons" ADD CONSTRAINT "ay3_persons_full_name_check" CHECK (((length(btrim(full_name)) >= 1) AND (length(btrim(full_name)) <= 150)));
ALTER TABLE public."ay3_persons" ADD CONSTRAINT "ay3_persons_phone_check" CHECK ((length(phone) <= 60));
ALTER TABLE public."ay3_persons" ADD CONSTRAINT "ay3_persons_email_check" CHECK ((length(email) <= 254));
ALTER TABLE public."ay3_persons" ADD CONSTRAINT "ay3_persons_language_check" CHECK ((language = ANY (ARRAY['tr'::text, 'de'::text, 'en'::text, 'fr'::text, 'ru'::text, 'other'::text])));
ALTER TABLE public."ay3_persons" ADD CONSTRAINT "ay3_persons_notes_check" CHECK ((length(notes) <= 5000));
ALTER TABLE public."ay3_persons" ADD CONSTRAINT "ay3_persons_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay3_persons" ADD CONSTRAINT "ay3_persons_id_site_id_key" UNIQUE (id, site_id);
ALTER TABLE public."ay3_persons" ADD CONSTRAINT "ay3_persons_site_id_auth_user_id_key" UNIQUE (site_id, auth_user_id);
ALTER TABLE public."ay3_links" ADD CONSTRAINT "ay3_links_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'tenant'::text, 'representative'::text])));
ALTER TABLE public."ay3_links" ADD CONSTRAINT "ay3_links_responsibility_check" CHECK ((length(responsibility) <= 1000));
ALTER TABLE public."ay3_links" ADD CONSTRAINT "ay3_links_check" CHECK (((ends_on IS NULL) OR (ends_on >= starts_on)));
ALTER TABLE public."ay3_links" ADD CONSTRAINT "ay3_links_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay3_links" ADD CONSTRAINT "ay3_links_id_site_id_key" UNIQUE (id, site_id);
ALTER TABLE public."ay2_charges" ADD CONSTRAINT "ay2_charges_check" CHECK (((period_to IS NULL) OR (period_from IS NULL) OR (period_to >= period_from)));
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_sender_name_check" CHECK ((length(sender_name) <= 150));
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_sender_iban_check" CHECK ((length(sender_iban) <= 40));
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_unit_hint_check" CHECK ((length(unit_hint) <= 10));
ALTER TABLE public."ay3_credits" ADD CONSTRAINT "ay3_credits_cents_check" CHECK (((cents > 0) AND (cents <= '900000000000'::bigint)));
ALTER TABLE public."ay3_credits" ADD CONSTRAINT "ay3_credits_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay3_credits" ADD CONSTRAINT "ay3_credits_site_id_request_id_key" UNIQUE (site_id, request_id);
ALTER TABLE public."ay3_match_rules" ADD CONSTRAINT "ay3_match_rules_alias_check" CHECK ((length(alias) <= 150));
ALTER TABLE public."ay3_match_rules" ADD CONSTRAINT "ay3_match_rules_iban_check" CHECK ((length(iban) <= 40));
ALTER TABLE public."ay3_match_rules" ADD CONSTRAINT "ay3_match_rules_check" CHECK (((length(alias) >= 4) OR (length(iban) >= 15)));
ALTER TABLE public."ay3_match_rules" ADD CONSTRAINT "ay3_match_rules_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay3_providers" ADD CONSTRAINT "ay3_providers_name_check" CHECK (((length(name) >= 1) AND (length(name) <= 150)));
ALTER TABLE public."ay3_providers" ADD CONSTRAINT "ay3_providers_category_check" CHECK (((length(category) >= 1) AND (length(category) <= 80)));
ALTER TABLE public."ay3_providers" ADD CONSTRAINT "ay3_providers_status_check" CHECK ((status = ANY (ARRAY['preferred'::text, 'backup'::text, 'avoid'::text])));
ALTER TABLE public."ay3_providers" ADD CONSTRAINT "ay3_providers_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay3_providers" ADD CONSTRAINT "ay3_providers_id_site_id_key" UNIQUE (id, site_id);
ALTER TABLE public."ay3_provider_notes" ADD CONSTRAINT "ay3_provider_notes_body_check" CHECK (((length(body) >= 1) AND (length(body) <= 5000)));
ALTER TABLE public."ay3_provider_notes" ADD CONSTRAINT "ay3_provider_notes_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay2_announcements" ADD CONSTRAINT "ay2_announcements_priority_check" CHECK ((priority = ANY (ARRAY['normal'::text, 'important'::text, 'urgent'::text])));
ALTER TABLE public."ay2_announcements" ADD CONSTRAINT "ay2_announcements_check" CHECK (((ends_at IS NULL) OR (starts_at IS NULL) OR (ends_at > starts_at)));
ALTER TABLE public."ay3_acknowledgements" ADD CONSTRAINT "ay3_acknowledgements_pkey" PRIMARY KEY (announcement_id, user_id, revision);
ALTER TABLE public."ay3_occupancy_changes" ADD CONSTRAINT "ay3_occupancy_changes_status_check" CHECK ((status = ANY (ARRAY['occupied'::text, 'vacant'::text, 'unknown'::text])));
ALTER TABLE public."ay3_occupancy_changes" ADD CONSTRAINT "ay3_occupancy_changes_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay3_occupancy_changes" ADD CONSTRAINT "ay3_occupancy_changes_site_id_unit_id_effective_on_key" UNIQUE (site_id, unit_id, effective_on);
ALTER TABLE public."ay3_user_preferences" ADD CONSTRAINT "ay3_user_preferences_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."ay3_review_receipts" ADD CONSTRAINT "ay3_review_receipts_kind_check" CHECK ((kind = ANY (ARRAY['stage'::text, 'payment'::text])));
ALTER TABLE public."ay3_review_receipts" ADD CONSTRAINT "ay3_review_receipts_pkey" PRIMARY KEY (id);
ALTER TABLE public."ay3_review_receipts" ADD CONSTRAINT "ay3_review_receipts_site_id_unit_id_kind_source_id_fingerpr_key" UNIQUE (site_id, unit_id, kind, source_id, fingerprint);
ALTER TABLE public."site_people" ADD CONSTRAINT "site_people_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id) ON DELETE RESTRICT;
ALTER TABLE public."ay2_audit" ADD CONSTRAINT "ay2_audit_actor_fkey" FOREIGN KEY (actor) REFERENCES auth.users(id);
ALTER TABLE public."ayapark_private" ADD CONSTRAINT "ayapark_private_id_fkey" FOREIGN KEY (id) REFERENCES ayapark_claims(id) ON DELETE CASCADE;
ALTER TABLE public."ayapark_admins" ADD CONSTRAINT "ayapark_admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."site_blocks" ADD CONSTRAINT "site_blocks_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id) ON DELETE RESTRICT;
ALTER TABLE public."site_units" ADD CONSTRAINT "site_units_block_id_site_id_fkey" FOREIGN KEY (block_id, site_id) REFERENCES site_blocks(id, site_id) ON DELETE RESTRICT;
ALTER TABLE public."site_staff_memberships" ADD CONSTRAINT "site_staff_memberships_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id) ON DELETE CASCADE;
ALTER TABLE public."site_staff_memberships" ADD CONSTRAINT "site_staff_memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."site_resident_units" ADD CONSTRAINT "site_resident_units_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES site_units(id) ON DELETE CASCADE;
ALTER TABLE public."site_resident_units" ADD CONSTRAINT "site_resident_units_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."site_unit_people" ADD CONSTRAINT "site_unit_people_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id) ON DELETE RESTRICT;
ALTER TABLE public."site_unit_people" ADD CONSTRAINT "site_unit_people_unit_id_site_id_fkey" FOREIGN KEY (unit_id, site_id) REFERENCES site_units(id, site_id) ON DELETE RESTRICT;
ALTER TABLE public."site_unit_people" ADD CONSTRAINT "site_unit_people_person_id_site_id_fkey" FOREIGN KEY (person_id, site_id) REFERENCES site_people(id, site_id) ON DELETE RESTRICT;
ALTER TABLE public."site_resident_units" ADD CONSTRAINT "site_resident_units_person_id_fkey" FOREIGN KEY (person_id) REFERENCES site_people(id) ON DELETE RESTRICT;
ALTER TABLE public."site_audit_events" ADD CONSTRAINT "site_audit_events_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id) ON DELETE RESTRICT;
ALTER TABLE public."site_audit_view_settings" ADD CONSTRAINT "site_audit_view_settings_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id) ON DELETE RESTRICT;
ALTER TABLE public."ay2_settings" ADD CONSTRAINT "ay2_settings_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay2_permissions" ADD CONSTRAINT "ay2_permissions_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay2_permissions" ADD CONSTRAINT "ay2_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public."ay2_batches" ADD CONSTRAINT "ay2_batches_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay2_batches" ADD CONSTRAINT "ay2_batches_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_batch_id_site_id_fkey" FOREIGN KEY (batch_id, site_id) REFERENCES ay2_batches(id, site_id);
ALTER TABLE public."ay2_entries" ADD CONSTRAINT "ay2_entries_reversal_of_site_id_fkey" FOREIGN KEY (reversal_of, site_id) REFERENCES ay2_entries(id, site_id);
ALTER TABLE public."ay3_acknowledgements" ADD CONSTRAINT "ay3_acknowledgements_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay3_acknowledgements" ADD CONSTRAINT "ay3_acknowledgements_announcement_id_fkey" FOREIGN KEY (announcement_id) REFERENCES ay2_announcements(id);
ALTER TABLE public."ay2_charges" ADD CONSTRAINT "ay2_charges_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay2_charges" ADD CONSTRAINT "ay2_charges_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public."ay2_charges" ADD CONSTRAINT "ay2_charges_unit_id_site_id_fkey" FOREIGN KEY (unit_id, site_id) REFERENCES site_units(id, site_id);
ALTER TABLE public."ay2_allocations" ADD CONSTRAINT "ay2_allocations_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay2_allocations" ADD CONSTRAINT "ay2_allocations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public."ay2_allocations" ADD CONSTRAINT "ay2_allocations_entry_id_site_id_fkey" FOREIGN KEY (entry_id, site_id) REFERENCES ay2_entries(id, site_id);
ALTER TABLE public."ay2_allocations" ADD CONSTRAINT "ay2_allocations_charge_id_site_id_fkey" FOREIGN KEY (charge_id, site_id) REFERENCES ay2_charges(id, site_id);
ALTER TABLE public."ay2_people" ADD CONSTRAINT "ay2_people_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay2_people" ADD CONSTRAINT "ay2_people_unit_id_site_id_fkey" FOREIGN KEY (unit_id, site_id) REFERENCES site_units(id, site_id);
ALTER TABLE public."ay2_announcements" ADD CONSTRAINT "ay2_announcements_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay2_announcements" ADD CONSTRAINT "ay2_announcements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public."ay2_reports" ADD CONSTRAINT "ay2_reports_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay2_reports" ADD CONSTRAINT "ay2_reports_published_by_fkey" FOREIGN KEY (published_by) REFERENCES auth.users(id);
ALTER TABLE public."ay2_audit" ADD CONSTRAINT "ay2_audit_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay2_staged_charges" ADD CONSTRAINT "ay2_staged_charges_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay2_staged_charges" ADD CONSTRAINT "ay2_staged_charges_confirmed_charge_fkey" FOREIGN KEY (confirmed_charge) REFERENCES ay2_charges(id);
ALTER TABLE public."ay3_persons" ADD CONSTRAINT "ay3_persons_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay3_persons" ADD CONSTRAINT "ay3_persons_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);
ALTER TABLE public."ay3_links" ADD CONSTRAINT "ay3_links_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay3_links" ADD CONSTRAINT "ay3_links_unit_id_site_id_fkey" FOREIGN KEY (unit_id, site_id) REFERENCES site_units(id, site_id);
ALTER TABLE public."ay3_links" ADD CONSTRAINT "ay3_links_person_id_site_id_fkey" FOREIGN KEY (person_id, site_id) REFERENCES ay3_persons(id, site_id);
ALTER TABLE public."ay2_charges" ADD CONSTRAINT "ay2_charges_person_id_site_id_fkey" FOREIGN KEY (person_id, site_id) REFERENCES ay3_persons(id, site_id);
ALTER TABLE public."ay2_charges" ADD CONSTRAINT "ay2_charges_link_id_site_id_fkey" FOREIGN KEY (link_id, site_id) REFERENCES ay3_links(id, site_id);
ALTER TABLE public."ay3_acknowledgements" ADD CONSTRAINT "ay3_acknowledgements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public."ay3_credits" ADD CONSTRAINT "ay3_credits_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay3_credits" ADD CONSTRAINT "ay3_credits_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public."ay3_credits" ADD CONSTRAINT "ay3_credits_entry_id_site_id_fkey" FOREIGN KEY (entry_id, site_id) REFERENCES ay2_entries(id, site_id);
ALTER TABLE public."ay3_credits" ADD CONSTRAINT "ay3_credits_unit_id_site_id_fkey" FOREIGN KEY (unit_id, site_id) REFERENCES site_units(id, site_id);
ALTER TABLE public."ay3_credits" ADD CONSTRAINT "ay3_credits_person_id_site_id_fkey" FOREIGN KEY (person_id, site_id) REFERENCES ay3_persons(id, site_id);
ALTER TABLE public."ay3_match_rules" ADD CONSTRAINT "ay3_match_rules_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay3_match_rules" ADD CONSTRAINT "ay3_match_rules_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public."ay3_match_rules" ADD CONSTRAINT "ay3_match_rules_unit_id_site_id_fkey" FOREIGN KEY (unit_id, site_id) REFERENCES site_units(id, site_id);
ALTER TABLE public."ay3_match_rules" ADD CONSTRAINT "ay3_match_rules_person_id_site_id_fkey" FOREIGN KEY (person_id, site_id) REFERENCES ay3_persons(id, site_id);
ALTER TABLE public."ay3_providers" ADD CONSTRAINT "ay3_providers_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay3_providers" ADD CONSTRAINT "ay3_providers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public."ay3_provider_notes" ADD CONSTRAINT "ay3_provider_notes_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay3_provider_notes" ADD CONSTRAINT "ay3_provider_notes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public."ay3_provider_notes" ADD CONSTRAINT "ay3_provider_notes_provider_id_site_id_fkey" FOREIGN KEY (provider_id, site_id) REFERENCES ay3_providers(id, site_id);
ALTER TABLE public."ay2_announcements" ADD CONSTRAINT "ay2_announcements_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public."ay3_occupancy_changes" ADD CONSTRAINT "ay3_occupancy_changes_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay3_occupancy_changes" ADD CONSTRAINT "ay3_occupancy_changes_unit_id_site_id_fkey" FOREIGN KEY (unit_id, site_id) REFERENCES site_units(id, site_id);
ALTER TABLE public."ay3_user_preferences" ADD CONSTRAINT "ay3_user_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."ay3_review_receipts" ADD CONSTRAINT "ay3_review_receipts_site_id_fkey" FOREIGN KEY (site_id) REFERENCES site_sites(id);
ALTER TABLE public."ay3_review_receipts" ADD CONSTRAINT "ay3_review_receipts_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES site_units(id);
ALTER TABLE public."ay3_review_receipts" ADD CONSTRAINT "ay3_review_receipts_actor_fkey" FOREIGN KEY (actor) REFERENCES auth.users(id);
SET check_function_bodies=off;
CREATE OR REPLACE FUNCTION public.ayapark_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    select exists (
      select 1 from public.ayapark_admins a
      where a.user_id = (select auth.uid())
    );
$function$
;
CREATE OR REPLACE FUNCTION public.ayapark_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    new.updated_at = now();
    return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.site_can_manage(target_site_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT EXISTS(
  SELECT 1 FROM public.site_staff_memberships sm
  WHERE sm.site_id=target_site_id AND sm.user_id=(SELECT auth.uid())
    AND sm.role IN ('manager','deputy')
 );
$function$
;
CREATE OR REPLACE FUNCTION public.site_can_view_unit(target_unit_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT EXISTS(
  SELECT 1 FROM public.site_units su JOIN public.site_staff_memberships sm
   ON sm.site_id=su.site_id AND sm.user_id=(SELECT auth.uid())
  WHERE su.id=target_unit_id
 ) OR EXISTS(
  SELECT 1 FROM public.site_resident_units ru
  WHERE ru.unit_id=target_unit_id AND ru.user_id=(SELECT auth.uid()) AND ru.active=true
 );
$function$
;
CREATE OR REPLACE FUNCTION public.site_is_staff(target_site_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT EXISTS(
  SELECT 1 FROM public.site_staff_memberships sm
  WHERE sm.site_id=target_site_id AND sm.user_id=(SELECT auth.uid())
 );
$function$
;
CREATE OR REPLACE FUNCTION public.site_can_view_site(target_site_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT EXISTS(
  SELECT 1 FROM public.site_staff_memberships sm
  WHERE sm.site_id=target_site_id AND sm.user_id=(SELECT auth.uid())
 ) OR EXISTS(
  SELECT 1 FROM public.site_resident_units ru
  JOIN public.site_units su ON su.id=ru.unit_id
  WHERE su.site_id=target_site_id AND ru.user_id=(SELECT auth.uid()) AND ru.active=true
 );
$function$
;
CREATE OR REPLACE FUNCTION public.site_restore_unit_person(target_link_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE rec record;
BEGIN
 SELECT id,site_id,unit_id,person_id,is_current INTO rec
 FROM public.site_unit_people WHERE id=target_link_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Kayıt bulunamadı.'; END IF;
 IF NOT public.site_can_manage(rec.site_id) THEN
  RAISE EXCEPTION 'Yetkiniz bulunmuyor.' USING ERRCODE='42501';
 END IF;
 IF rec.is_current THEN RAISE EXCEPTION 'Kayıt zaten aktif.'; END IF;
 PERFORM set_config('app.ayapark_transition','restore',true);
 UPDATE public.site_unit_people SET is_current=true,ended_on=NULL,
   archived_at=NULL,archived_by=NULL,archive_reason=NULL WHERE id=target_link_id;
 -- Portal credentials are not silently reactivated; manager sends access anew.
 RETURN 'restored';
END
$function$
;
CREATE OR REPLACE FUNCTION public.site_register_unit_person(target_unit_id uuid, person_full_name text, person_relation text, person_phone text DEFAULT ''::text, person_email text DEFAULT ''::text, person_note text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE sid uuid; new_person_id uuid;
BEGIN
 SELECT u.site_id INTO sid FROM public.site_units u WHERE u.id=target_unit_id;
 IF sid IS NULL OR NOT public.site_can_manage(sid) THEN
  RAISE EXCEPTION 'Permission denied' USING ERRCODE='42501';
 END IF;
 IF person_relation IS NULL OR person_relation NOT IN ('owner','tenant') THEN
  RAISE EXCEPTION 'Invalid relation';
 END IF;
 INSERT INTO public.site_people(site_id,full_name,phone,email,admin_note)
 VALUES(sid,btrim(person_full_name),btrim(coalesce(person_phone,'')),
   btrim(coalesce(person_email,'')),btrim(coalesce(person_note,'')))
 RETURNING id INTO new_person_id;
 INSERT INTO public.site_unit_people(site_id,unit_id,person_id,relation)
 VALUES(sid,target_unit_id,new_person_id,person_relation);
 RETURN new_person_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.site_link_existing_person(target_unit_id uuid, existing_person_id uuid, person_relation text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE sid uuid; linked_id uuid;
BEGIN
 SELECT u.site_id INTO sid FROM public.site_units u WHERE u.id=target_unit_id;
 IF sid IS NULL OR NOT public.site_can_manage(sid) THEN
   RAISE EXCEPTION 'Permission denied' USING ERRCODE='42501'; END IF;
 IF person_relation IS NULL OR person_relation NOT IN ('owner','tenant') THEN
   RAISE EXCEPTION 'Invalid relation'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.site_people p WHERE p.id=existing_person_id AND p.site_id=sid) THEN
   RAISE EXCEPTION 'Person not found in this site'; END IF;
 -- The archive is a deliberate restore operation, including an audit event.
 PERFORM set_config('app.ayapark_transition','restore',true);
 INSERT INTO public.site_unit_people(site_id,unit_id,person_id,relation,is_current)
 VALUES(sid,target_unit_id,existing_person_id,person_relation,true)
 ON CONFLICT (unit_id,person_id) DO UPDATE SET
  relation=EXCLUDED.relation,is_current=true,ended_on=NULL,
  archived_at=NULL,archive_reason=NULL,archived_by=NULL,updated_at=now()
 RETURNING id INTO linked_id;
 RETURN linked_id;
END
$function$
;
CREATE OR REPLACE FUNCTION public.site_unit_person_audit_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE changed text[];
DECLARE event_name text;
DECLARE detail jsonb;
BEGIN
 IF TG_OP='INSERT' THEN
  PERFORM public.site_write_audit_event(NEW.site_id,NEW.unit_id,NEW.person_id,
   'relation_created',ARRAY['relation','is_current'],
   jsonb_build_object('relation',NEW.relation));
  RETURN NEW;
 ELSIF TG_OP='UPDATE' THEN
  IF OLD.is_current IS DISTINCT FROM NEW.is_current THEN
   IF coalesce(current_setting('app.ayapark_transition',true),'') NOT IN ('archive','restore') THEN
     RAISE EXCEPTION 'Arşiv işlemi için yönetim arşiv veya geri yükle butonunu kullanın.' USING ERRCODE='42501';
   END IF;
   event_name:=CASE WHEN NEW.is_current THEN 'relation_restored' ELSE 'relation_archived' END;
  ELSE
   event_name:='relation_updated';
  END IF;
  SELECT array_agg(k) INTO changed FROM (
   VALUES ('relation',OLD.relation IS DISTINCT FROM NEW.relation),
          ('is_current',OLD.is_current IS DISTINCT FROM NEW.is_current),
          ('started_on',OLD.started_on IS DISTINCT FROM NEW.started_on),
          ('ended_on',OLD.ended_on IS DISTINCT FROM NEW.ended_on),
          ('archived_at',OLD.archived_at IS DISTINCT FROM NEW.archived_at)
  ) t(k,different) WHERE different;
  IF changed IS NOT NULL THEN
   detail:=jsonb_build_object('old_relation',OLD.relation,'new_relation',NEW.relation);
   IF event_name='relation_archived' THEN
    detail:=detail||jsonb_build_object('reason',coalesce(NEW.archive_reason,''));
   END IF;
   PERFORM public.site_write_audit_event(NEW.site_id,NEW.unit_id,NEW.person_id,event_name,changed,detail);
  END IF;
  RETURN NEW;
 ELSE
  PERFORM public.site_write_audit_event(OLD.site_id,OLD.unit_id,OLD.person_id,
    'relation_erased',ARRAY[]::text[],
    jsonb_build_object('reason',coalesce(current_setting('app.ayapark_action_reason',true),'not_set')));
  RETURN OLD;
 END IF;
END
$function$
;
CREATE OR REPLACE FUNCTION public.site_portal_audit_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE _site uuid;
DECLARE _unit uuid;
DECLARE _person uuid;
DECLARE _type text;
BEGIN
 _unit:=CASE WHEN TG_OP='DELETE' THEN OLD.unit_id ELSE NEW.unit_id END;
 _person:=CASE WHEN TG_OP='DELETE' THEN OLD.person_id ELSE NEW.person_id END;
 SELECT site_id INTO _site FROM public.site_units WHERE id=_unit;
 IF TG_OP='INSERT' THEN _type:='portal_access_granted';
 ELSIF TG_OP='DELETE' THEN _type:='portal_access_removed';
 ELSIF OLD.active IS DISTINCT FROM NEW.active THEN
   _type:=CASE WHEN NEW.active THEN 'portal_access_enabled' ELSE 'portal_access_disabled' END;
 ELSE RETURN NEW;
 END IF;
 PERFORM public.site_write_audit_event(_site,_unit,_person,_type,
    ARRAY['portal_access'], '{}'::jsonb);
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END
$function$
;
CREATE OR REPLACE FUNCTION public.site_unit_status_audit_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NEW.occupancy_status IS DISTINCT FROM OLD.occupancy_status THEN
  PERFORM public.site_write_audit_event(NEW.site_id,NEW.id,NULL,'unit_status_changed',
   ARRAY['occupancy_status'],
   jsonb_build_object('from',OLD.occupancy_status,'to',NEW.occupancy_status));
 END IF;
 RETURN NEW;
END
$function$
;
CREATE OR REPLACE FUNCTION public.site_person_audit_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 changed text[];
 why text;
 payload jsonb;
BEGIN
 IF TG_OP='INSERT' THEN
  PERFORM public.site_write_audit_event(
   NEW.site_id,NULL,NEW.id,'person_created',
   ARRAY['full_name','phone','email','admin_note'],'{}'::jsonb);
  RETURN NEW;
 ELSIF TG_OP='UPDATE' THEN
  SELECT array_agg(k) INTO changed
  FROM (VALUES
    ('full_name',OLD.full_name IS DISTINCT FROM NEW.full_name),
    ('phone',OLD.phone IS DISTINCT FROM NEW.phone),
    ('email',OLD.email IS DISTINCT FROM NEW.email),
    ('admin_note',OLD.admin_note IS DISTINCT FROM NEW.admin_note)
  ) t(k,different)
  WHERE different;
  IF changed IS NOT NULL THEN
   PERFORM public.site_write_audit_event(
    NEW.site_id,NULL,NEW.id,'person_updated',
    changed,'{}'::jsonb);
  END IF;
  RETURN NEW;
 ELSE
  why:=coalesce(nullif(current_setting('app.ayapark_action_reason',true),''),'not_set');
  payload:=jsonb_build_object('reason',why);
  IF why<>'kvkk_imha' THEN
   payload:=payload||jsonb_build_object('subject_name',OLD.full_name);
  END IF;
  PERFORM public.site_write_audit_event(
   OLD.site_id,NULL,OLD.id,'person_erased',ARRAY[]::text[],payload);
  RETURN OLD;
 END IF;
END
$function$
;
CREATE OR REPLACE FUNCTION public.site_delete_unit_person(target_link_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ BEGIN RAISE EXCEPTION 'Silme işlemi için güncel sayfayı yenileyin ve arşiv/silme protokolünü kullanın.'; END $function$
;
CREATE OR REPLACE FUNCTION public.ay2_capabilities(p_site uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select ay2_private.capabilities(p_site); $function$
;
CREATE OR REPLACE FUNCTION public.ay2_command(p_site uuid, p_action text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
  DECLARE result jsonb;
  BEGIN
   IF p_action='relationship_change' THEN RETURN ay2_private.change_relationship(p_site,p_payload);END IF;
   IF p_action='unlink' THEN RETURN ay2_private.unlink_relationship(p_site,p_payload);END IF;
   result:=ay2_private.command(p_site,p_action,p_payload);
   IF p_action='occupancy' THEN PERFORM ay2_private.record_occupancy(p_site,(p_payload->>'unit_id')::uuid,(now() at time zone 'Europe/Istanbul')::date,p_payload->>'status');END IF;
   RETURN result;
  END;$function$
;
CREATE OR REPLACE FUNCTION public.site_archive_unit_person(target_link_id uuid, archive_note text DEFAULT ''::text, departure_date date DEFAULT CURRENT_DATE)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE rec record;
BEGIN
 SELECT id,site_id,unit_id,person_id,is_current,started_on INTO rec
 FROM public.site_unit_people WHERE id=target_link_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Kayıt bulunamadı.'; END IF;
 IF NOT public.site_can_manage(rec.site_id) THEN
  RAISE EXCEPTION 'Yetkiniz bulunmuyor.' USING ERRCODE='42501';
 END IF;
 IF NOT rec.is_current THEN RAISE EXCEPTION 'Kayıt zaten arşivde.'; END IF;
 IF departure_date>current_date OR (rec.started_on IS NOT NULL AND departure_date<rec.started_on) THEN
  RAISE EXCEPTION 'Çıkış tarihi geçersiz.'; END IF;
 IF length(btrim(coalesce(archive_note,'')))>500 THEN RAISE EXCEPTION 'Arşiv açıklaması çok uzun.'; END IF;
 PERFORM set_config('app.ayapark_transition','archive',true);
 UPDATE public.site_unit_people SET is_current=false,ended_on=departure_date,
   archived_at=clock_timestamp(),archived_by=auth.uid(),
   archive_reason=nullif(btrim(coalesce(archive_note,'')),'')
   WHERE id=target_link_id;
 UPDATE public.site_resident_units SET active=false
   WHERE unit_id=rec.unit_id AND person_id=rec.person_id AND active;
 RETURN 'archived';
END
$function$
;
CREATE OR REPLACE FUNCTION public.site_write_audit_event(_site uuid, _unit uuid, _person uuid, _event text, _fields text[], _details jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 payload jsonb := coalesce(_details,'{}'::jsonb);
 person_name text;
 apartment_code text;
 lawful_purge boolean;
BEGIN
 IF _site IS NULL THEN RETURN; END IF;

 lawful_purge := coalesce(current_setting('app.ayapark_action_reason',true),'')='kvkk_imha';
 IF _person IS NOT NULL AND NOT lawful_purge THEN
  SELECT full_name INTO person_name FROM public.site_people
   WHERE id=_person AND site_id=_site;
  IF person_name IS NOT NULL THEN
   payload := payload || jsonb_build_object('subject_name',person_name);
  END IF;
 END IF;
 IF lawful_purge THEN
  payload := payload - 'subject_name';
 END IF;
 IF _unit IS NOT NULL THEN
  SELECT code INTO apartment_code
   FROM public.site_units WHERE id=_unit AND site_id=_site;
  IF apartment_code IS NOT NULL THEN
   payload:=payload || jsonb_build_object('unit_code',apartment_code);
  END IF;
 END IF;
 INSERT INTO public.site_audit_events
  (site_id,unit_id,person_id,actor_user_id,actor_email,event_type,changed_fields,details)
 VALUES
  (_site,_unit,_person,auth.uid(),
   nullif(coalesce(auth.jwt()->>'email',''),''),
   _event,coalesce(_fields,ARRAY[]::text[]),payload);
END
$function$
;
CREATE OR REPLACE FUNCTION public.ay3_review_state(p_site uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
 IF NOT ay2_private.can(p_site,'finance') THEN RETURN jsonb_build_object('sources','[]'::jsonb,'receipts','[]'::jsonb);END IF;
 RETURN jsonb_build_object('sources',coalesce((SELECT jsonb_agg(t) FROM ay2_private.review_sources(p_site) t),'[]'::jsonb),'receipts',coalesce((SELECT jsonb_agg(t ORDER BY reviewed_at DESC) FROM public.ay3_review_receipts t WHERE site_id=p_site),'[]'::jsonb));
END;$function$
;
CREATE OR REPLACE FUNCTION public.ay3_remove_staff_member(p_site uuid, p_user uuid, p_confirm boolean, p_reason text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_actor uuid := auth.uid();
 v_role text;
 v_reason text := btrim(coalesce(p_reason, ''));
BEGIN
 IF v_actor IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.site_staff_memberships
   WHERE site_id=p_site AND user_id=v_actor AND role='manager'
 ) THEN
  RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING ERRCODE='42501';
 END IF;
 IF p_confirm IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Devam etmek için onay kutusunu işaretleyin.' USING ERRCODE='P0001';
 END IF;
 IF p_user IS NULL OR p_user=v_actor THEN
  RAISE EXCEPTION 'Kendi yönetim erişiminizi kaldıramazsınız.' USING ERRCODE='P0001';
 END IF;
 IF char_length(v_reason)<3 OR char_length(v_reason)>500 THEN
  RAISE EXCEPTION 'En az üç karakterlik gerekçe yazın.' USING ERRCODE='P0001';
 END IF;
 -- Serialize management changes for this site to protect its last manager.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_site::text, 20261024));
 SELECT role INTO v_role
 FROM public.site_staff_memberships
 WHERE site_id=p_site AND user_id=p_user
 FOR UPDATE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Yönetim üyesi bulunamadı.' USING ERRCODE='P0001';
 END IF;
 IF v_role='manager' AND (
   SELECT count(*) FROM public.site_staff_memberships
   WHERE site_id=p_site AND role='manager'
 )<=1 THEN
  RAISE EXCEPTION 'Son Süper Admin kaldırılamaz.' USING ERRCODE='P0001';
 END IF;
 DELETE FROM public.ay2_permissions WHERE site_id=p_site AND user_id=p_user;
 DELETE FROM public.site_staff_memberships WHERE site_id=p_site AND user_id=p_user;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details)
 VALUES(p_site,v_actor,'staff_remove',p_user,
   jsonb_build_object('old_role',v_role,'reason',v_reason,'scope','management_only'));
 RETURN jsonb_build_object('ok',true,'user_id',p_user);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.site_purge_unit_person(target_link_id uuid, erase_reason text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE rec record; remaining integer;
BEGIN
 SELECT id,site_id,unit_id,person_id,is_current
 INTO rec
 FROM public.site_unit_people WHERE id=target_link_id FOR UPDATE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Kişi kaydı bulunamadı.';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.site_staff_memberships
   WHERE site_id=rec.site_id AND user_id=auth.uid() AND role='manager'
 ) THEN
  RAISE EXCEPTION 'Kalıcı silme yalnızca yönetici tarafından yapılabilir.' USING ERRCODE='42501';
 END IF;
 IF rec.is_current THEN
  RAISE EXCEPTION 'Aktif kişiler doğrudan silinemez. Önce kişiyi arşivleyin.' USING ERRCODE='23514';
 END IF;
 IF erase_reason NOT IN ('yanlis_kayit','kvkk_imha') THEN
  RAISE EXCEPTION 'Silme gerekçesi seçin.';
 END IF;
 PERFORM 1 FROM public.site_people WHERE id=rec.person_id FOR UPDATE;
 PERFORM set_config('app.ayapark_action_reason',erase_reason,true);

 IF erase_reason='kvkk_imha' THEN
  UPDATE public.site_audit_events
    SET details=(details-'subject_name'-'reason') || jsonb_build_object('privacy_erased',true)
    WHERE site_id=rec.site_id AND person_id=rec.person_id;
 END IF;

 DELETE FROM public.site_resident_units
 WHERE person_id=rec.person_id AND unit_id=rec.unit_id;
 DELETE FROM public.site_unit_people WHERE id=rec.id;
 SELECT COUNT(*) INTO remaining
  FROM public.site_unit_people WHERE person_id=rec.person_id;
 IF remaining=0 THEN
  DELETE FROM public.site_resident_units WHERE person_id=rec.person_id;
  DELETE FROM public.site_people WHERE id=rec.person_id;
  RETURN 'person_erased';
 END IF;
 RETURN 'relation_erased';
END
$function$
;
CREATE OR REPLACE FUNCTION public.ay3_financial_summary(p_site uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$select ay2_private.financial_summary(p_site);$function$
;
CREATE OR REPLACE FUNCTION public.ay2_workspace(p_site uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object(
 'capabilities',ay2_private.capabilities(p_site),
 'settings',coalesce((select jsonb_agg(t) from public.ay2_settings t where site_id=p_site),'[]'::jsonb),
 'permissions',coalesce((select jsonb_agg(t) from public.ay2_permissions t where site_id=p_site),'[]'::jsonb),
 'entries',coalesce((select jsonb_agg(t order by booked_on desc,created_at desc,id) from public.ay2_entries t where site_id=p_site),'[]'::jsonb),
 'charges',coalesce((select jsonb_agg(t order by due_on,id) from public.ay2_charges t where site_id=p_site),'[]'::jsonb),
 'allocations',coalesce((select jsonb_agg(t) from public.ay2_allocations t where site_id=p_site),'[]'::jsonb),
 'occupancy_changes',coalesce((select jsonb_agg(t order by effective_on desc) from public.ay3_occupancy_changes t where site_id=p_site),'[]'::jsonb),
 'people','[]'::jsonb,
 'persons',case when ay2_private.can(p_site,'people') then coalesce((select jsonb_agg(t order by full_name) from public.ay3_persons t where site_id=p_site),'[]'::jsonb) else ay2_private.finance_people(p_site) end,
 'links',coalesce((select jsonb_agg(t) from public.ay3_links t where site_id=p_site),'[]'::jsonb),
 'credits',coalesce((select jsonb_agg(t) from public.ay3_credits t where site_id=p_site),'[]'::jsonb),
 'match_rules',coalesce((select jsonb_agg(t) from public.ay3_match_rules t where site_id=p_site),'[]'::jsonb),
 'providers',coalesce((select jsonb_agg(t order by name) from public.ay3_providers t where site_id=p_site),'[]'::jsonb),
 'provider_notes',coalesce((select jsonb_agg(t order by created_at desc) from public.ay3_provider_notes t where site_id=p_site),'[]'::jsonb),
 'acknowledgements',coalesce((select jsonb_agg(t) from public.ay3_acknowledgements t where site_id=p_site),'[]'::jsonb),
 'announcements',coalesce((select jsonb_agg(t order by created_at desc,id) from public.ay2_announcements t where site_id=p_site),'[]'::jsonb),
 'reports',coalesce((select jsonb_agg(t order by period desc) from public.ay2_reports t where site_id=p_site),'[]'::jsonb),
 'audit','[]'::jsonb,
 'staged_charges',coalesce((select jsonb_agg(t) from public.ay2_staged_charges t where site_id=p_site),'[]'::jsonb)
 ) where ay2_private.view_site(p_site);
$function$
;
CREATE OR REPLACE FUNCTION public.ay3_access_target(p_actor uuid, p_person uuid, p_role text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$select ay2_private.access_target(p_actor,p_person,p_role);$function$
;
CREATE OR REPLACE FUNCTION public.ay3_audit_page(p_site uuid, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
BEGIN
 IF NOT ay2_private.can(p_site,'admin') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING ERRCODE='42501';END IF;
 IF p_limit NOT IN (10,50,100) OR p_offset<0 THEN RAISE EXCEPTION 'Invalid page';END IF;
 RETURN jsonb_build_object('total',(SELECT count(*) FROM public.ay2_audit WHERE site_id=p_site),'rows',coalesce((SELECT jsonb_agg(t ORDER BY id DESC) FROM (SELECT * FROM public.ay2_audit WHERE site_id=p_site ORDER BY id DESC LIMIT p_limit OFFSET p_offset) t),'[]'::jsonb));
END;$function$
;
CREATE OR REPLACE FUNCTION public.ay3_provider_directory(p_site uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$select ay2_private.provider_directory(p_site);$function$
;
CREATE OR REPLACE FUNCTION public.ay3_preferences(p_settings jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF p_settings IS NOT NULL THEN
  IF jsonb_typeof(p_settings)<>'object' OR p_settings-'palette'-'loader'-'font'-'contrast'-'density'-'motion'-'hideAmounts'-'language'-'theme'<>'{}'::jsonb
   OR NOT (p_settings->>'palette'=ANY(ARRAY['classic','ocean','slate','plum','sand','ayapark']))
   OR NOT (p_settings->>'loader'=ANY(ARRAY['ring','dots','bar','pulse','wave']))
   OR NOT (p_settings->>'font'=ANY(ARRAY['normal','large','xlarge']))
   OR NOT (p_settings->>'contrast'=ANY(ARRAY['normal','high']))
   OR NOT (p_settings->>'density'=ANY(ARRAY['compact','comfortable']))
   OR NOT (p_settings->>'motion'=ANY(ARRAY['system','reduce']))
   OR NOT (p_settings->>'language'=ANY(ARRAY['de','tr']))
   OR NOT (p_settings->>'theme'=ANY(ARRAY['system','light','dark']))
   OR jsonb_typeof(p_settings->'hideAmounts') IS DISTINCT FROM 'boolean'
   OR (SELECT count(*) FROM jsonb_object_keys(p_settings))<>9 THEN RAISE EXCEPTION 'Invalid preferences'; END IF;
  INSERT INTO public.ay3_user_preferences(user_id,settings) VALUES(auth.uid(),p_settings)
  ON CONFLICT(user_id) DO UPDATE SET settings=excluded.settings,updated_at=now();
 END IF;
 SELECT settings INTO v FROM public.ay3_user_preferences WHERE user_id=auth.uid();RETURN coalesce(v,'{}'::jsonb);
END;$function$
;
CREATE OR REPLACE FUNCTION public.ay3_review_selected(p_site uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ SELECT ay2_private.review_selected(p_site,p_items); $function$
;
CREATE OR REPLACE FUNCTION public.ay3_staff_directory(p_site uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ SELECT ay2_private.staff_directory(p_site); $function$
;
CREATE OR REPLACE FUNCTION public.ay3_provision_access(p_actor uuid, p_person uuid, p_user uuid, p_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare p public.ay3_persons; target jsonb;
begin
 select * into p from public.ay3_persons where id=p_person for update;
 target:=public.ay3_access_target(p_actor,p_person,p_role);
 if (target->>'user_id')::uuid is distinct from p_user then raise exception 'Account mismatch';end if;
 -- Do not silently change existing management roles through resident provisioning.
 if p_role='resident' and exists(select 1 from public.site_staff_memberships where site_id=p.site_id and user_id=p_user) then raise exception 'Existing management role must be reviewed';end if;
 if p_role in ('manager','deputy') and exists(select 1 from public.site_staff_memberships where site_id=p.site_id and user_id=p_user and role<>p_role) then raise exception 'Existing management role must be reviewed';end if;
 update public.ay3_persons set auth_user_id=p_user where id=p.id;
 insert into public.site_resident_units(unit_id,user_id,role,person_id,active)
 select unit_id,p_user,role,NULL,true from public.ay3_links where person_id=p.id and site_id=p.site_id and role in ('owner','tenant') and active
 on conflict(unit_id,user_id,role) do update set active=true;
 if p_role in ('manager','deputy') then insert into public.site_staff_memberships(site_id,user_id,role) values(p.site_id,p_user,p_role) on conflict(site_id,user_id) do nothing;end if;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p.site_id,p_actor,'user_access',p.id,jsonb_build_object('role',p_role));
 return jsonb_build_object('ok',true);
end;$function$
;
CREATE OR REPLACE FUNCTION public.ay3_prepare_access_person(p_actor uuid, p_site uuid, p_first_name text, p_last_name text, p_email text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$ SELECT ay2_private.prepare_access_person(p_actor,p_site,p_first_name,p_last_name,p_email); $function$
;
CREATE OR REPLACE FUNCTION ay2_private.can(s uuid, cap text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and exists(select 1 from public.site_staff_memberships m where m.site_id=s and m.user_id=auth.uid() and (m.role='manager' or (m.role in ('deputy','auditor') and cap<>'admin' and exists(select 1 from public.ay2_permissions p where p.site_id=s and p.user_id=auth.uid() and cap=any(p.capabilities)))));
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.own_unit(u uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and exists(select 1 from public.site_resident_units r where r.unit_id=u and r.user_id=auth.uid() and r.active);
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.view_site(s uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and public.site_can_view_site(s);
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.capabilities(s uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select jsonb_build_object('finance',ay2_private.can(s,'finance'),'import',ay2_private.can(s,'import'),'people',ay2_private.can(s,'people'),'announcements',ay2_private.can(s,'announcements'),'admin',ay2_private.can(s,'admin'));
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.command_v2(s uuid, act text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 need text; ident uuid; u uuid; e public.ay2_entries; c public.ay2_charges; a public.ay2_allocations;
 n bigint; paid bigint; used bigint; item jsonb; inserted_count int:=0; duplicate_count int:=0;
 batch uuid; fingerprint text; period_start date; period_end date; opening bigint; income bigint; expense bigint;
 original public.ay2_staged_charges; caps text[]; result jsonb;
begin
 if auth.uid() is null then raise exception 'Giriş gerekli.' using errcode='42501'; end if;
 need:=case when act in ('permissions','settings','publish_report') then 'admin' when act='import' then 'import' when act='person' then 'people' when act='announcement' then 'announcements' else 'finance' end;
 if not ay2_private.can(s,need) then raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501'; end if;
 -- Serialize per-site financial commands; avoids import/publish/allocation races.
 perform pg_advisory_xact_lock(hashtextextended(s::text,0));
 if act='settings' then
  if exists(select 1 from public.ay2_entries where site_id=s) then raise exception 'Hareketler varken açılış değiştirilemez.'; end if;
  insert into public.ay2_settings(site_id,opening_cents,opening_date,initialized) values(s,(p->>'opening_cents')::bigint,(p->>'opening_date')::date,true)
  on conflict(site_id) do update set opening_cents=excluded.opening_cents,opening_date=excluded.opening_date,initialized=true;
 elsif act='permissions' then
  u:=(p->>'user_id')::uuid;
  if not exists(select 1 from public.site_staff_memberships where site_id=s and user_id=u and role in ('deputy','auditor')) then raise exception 'Yönetim üyesi bulunamadı.'; end if;
  select coalesce(array_agg(x),'{}') into caps from jsonb_array_elements_text(p->'capabilities') x;
  insert into public.ay2_permissions(site_id,user_id,capabilities) values(s,u,caps) on conflict(site_id,user_id) do update set capabilities=excluded.capabilities;
 elsif act='import' then
  if jsonb_typeof(p->'entries')<>'array' or jsonb_array_length(p->'entries') not between 1 and 2000 then raise exception '1–2000 hareket gerekli.'; end if;
  if not exists(select 1 from public.ay2_settings where site_id=s and initialized) then raise exception 'Önce açılış bakiyesini belirleyin.'; end if;
  insert into public.ay2_batches(site_id,source_name,digest,row_count,created_by) values(s,p->>'source',p->>'digest',jsonb_array_length(p->'entries'),auth.uid())
  on conflict(site_id,digest) do nothing returning id into batch;
  if batch is null then return jsonb_build_object('inserted',0,'duplicates',jsonb_array_length(p->'entries'),'already_imported',true); end if;
  for item in select value from jsonb_array_elements(p->'entries') loop
   if (item->>'date')::date < (select opening_date from public.ay2_settings where site_id=s) then raise exception 'Açılıştan önceki hareket aktarılamaz.'; end if;
   fingerprint:=md5(jsonb_build_array(item->>'date',btrim(item->>'desc'),(item->>'cents')::bigint,coalesce(item->>'reference',''),item->>'balance_cents')::text);
   ident:=null;
   insert into public.ay2_entries(site_id,booked_on,description,category,cents,bank_reference,dedup_key,batch_id,created_by)
   values(s,(item->>'date')::date,btrim(item->>'desc'),coalesce(nullif(item->>'category',''),'Diğer'),(item->>'cents')::bigint,coalesce(item->>'reference',''),fingerprint,batch,auth.uid())
   on conflict(site_id,dedup_key) do nothing returning id into ident;
   if ident is null then duplicate_count:=duplicate_count+1; else inserted_count:=inserted_count+1; end if;
  end loop;
  result:=jsonb_build_object('inserted',inserted_count,'duplicates',duplicate_count);
 elsif act='entry' then
  if not exists(select 1 from public.ay2_settings where site_id=s and initialized and opening_date<=(p->>'date')::date) then raise exception 'Açılış tarihi ve bakiyesi gerekli.'; end if;
  insert into public.ay2_entries(site_id,booked_on,description,category,cents,bank_reference,dedup_key,created_by)
  values(s,(p->>'date')::date,p->>'desc',p->>'category',(p->>'cents')::bigint,coalesce(p->>'reference',''),'manual:'||(p->>'request_id')::uuid,auth.uid())
  on conflict(site_id,dedup_key) do nothing returning id into ident;
 elsif act='charge' then
  u:=(p->>'unit_id')::uuid;
  insert into public.ay2_charges(site_id,unit_id,category,label,due_on,cents,payer,reference,created_by)
  values(s,u,p->>'category',p->>'label',(p->>'due_on')::date,(p->>'cents')::bigint,p->>'payer',p->>'reference',auth.uid())
  on conflict(site_id,unit_id,reference) do nothing returning id into ident;
 elsif act='monthly' then
  period_start:=date_trunc('month',(p->>'due_on')::date)::date;
  for u in select id from public.site_units where site_id=s loop
   insert into public.ay2_charges(site_id,unit_id,category,label,due_on,cents,payer,reference,created_by)
   values(s,u,'Aidat',p->>'label',(p->>'due_on')::date,(p->>'cents')::bigint,p->>'payer','monthly:'||period_start,auth.uid())
   on conflict(site_id,unit_id,reference) do nothing;
  end loop;
 elsif act='allocate' then
  select * into a from public.ay2_allocations where site_id=s and request_id=(p->>'request_id')::uuid;
  if found then
   if a.entry_id is distinct from (p->>'entry_id')::uuid or a.charge_id is distinct from (p->>'charge_id')::uuid or a.cents is distinct from (p->>'cents')::bigint then
    raise exception 'Bu istek daha önce farklı değerlerle kaydedildi. Yeni işlem açın.';
   end if;
   return jsonb_build_object('id',a.id,'already_recorded',true);
  end if;
  select * into e from public.ay2_entries where id=(p->>'entry_id')::uuid and site_id=s for update;
  if not found or e.cents<0 or e.reversal_of is not null or exists(select 1 from public.ay2_entries where reversal_of=e.id) then raise exception 'Geçerli tahsilat bulunamadı.'; end if;
  select * into c from public.ay2_charges where id=(p->>'charge_id')::uuid and site_id=s for update;
  if not found or c.void_reason is not null then raise exception 'Geçerli borç bulunamadı.'; end if;
  n:=(p->>'cents')::bigint;
  select coalesce(sum(cents),0) into used from public.ay2_allocations where entry_id=e.id and void_reason is null;
  select coalesce(sum(cents),0) into paid from public.ay2_allocations where charge_id=c.id and void_reason is null;
  if n is null or n<=0 or n>e.cents-used or n>c.cents-paid then raise exception 'Tutar ödeme veya borç bakiyesini aşıyor.'; end if;
  insert into public.ay2_allocations(site_id,entry_id,charge_id,request_id,cents,created_by) values(s,e.id,c.id,(p->>'request_id')::uuid,n,auth.uid()) returning id into ident;
 elsif act='unallocate' then
  if length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'Düzeltme gerekçesi gerekli.'; end if;
  update public.ay2_allocations set void_reason=p->>'reason' where site_id=s and id=(p->>'id')::uuid and void_reason is null returning id into ident;
  if ident is null then raise exception 'Aktif eşleştirme bulunamadı.'; end if;
 elsif act='void_charge' then
  if length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'İptal gerekçesi gerekli.'; end if;
  select * into c from public.ay2_charges where site_id=s and id=(p->>'id')::uuid for update;
  if not found or c.void_reason is not null then raise exception 'Borç bulunamadı.'; end if;
  if exists(select 1 from public.ay2_allocations where charge_id=c.id and void_reason is null) then raise exception 'Önce ödeme eşleştirmelerini kaldırın.'; end if;
  update public.ay2_charges set void_reason=p->>'reason' where id=c.id returning id into ident;
 elsif act='reverse' then
  if length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'Storno gerekçesi gerekli.'; end if;
  select * into e from public.ay2_entries where site_id=s and id=(p->>'id')::uuid for update;
  if not found or e.reversal_of is not null then raise exception 'Hareket bulunamadı.'; end if;
  if exists(select 1 from public.ay2_allocations where entry_id=e.id and void_reason is null) then raise exception 'Önce ödeme eşleştirmelerini kaldırın.'; end if;
  insert into public.ay2_entries(site_id,booked_on,description,category,cents,dedup_key,reversal_of,created_by)
  values(s,(now() at time zone 'Europe/Istanbul')::date,left('STORNO: '||(p->>'reason'),500),e.category,-e.cents,'reverse:'||e.id,e.id,auth.uid()) returning id into ident;
 elsif act='person' then
  ident:=nullif(p->>'id','')::uuid;
  if ident is null then
   insert into public.ay2_people(site_id,unit_id,full_name,relation,email,phone) values(s,(p->>'unit_id')::uuid,btrim(p->>'full_name'),p->>'relation',coalesce(p->>'email',''),coalesce(p->>'phone','')) returning id into ident;
  else
   update public.ay2_people set full_name=btrim(p->>'full_name'),email=coalesce(p->>'email',''),phone=coalesce(p->>'phone',''),relation=p->>'relation',active=coalesce((p->>'active')::boolean,true) where site_id=s and id=ident;
   if not found then raise exception 'Kişi bulunamadı.'; end if;
  end if;
 elsif act='announcement' then
  ident:=nullif(p->>'id','')::uuid;
  if ident is null then
   insert into public.ay2_announcements(site_id,title,body,published,created_by) values(s,p->>'title',p->>'body',coalesce((p->>'published')::boolean,false),auth.uid()) returning id into ident;
  else
   update public.ay2_announcements set title=p->>'title',body=p->>'body',published=coalesce((p->>'published')::boolean,false) where site_id=s and id=ident;
   if not found then raise exception 'Duyuru bulunamadı.'; end if;
  end if;
 elsif act='publish_report' then
  period_start:=date_trunc('month',(p->>'period')::date)::date;period_end:=(period_start+interval '1 month')::date;
  if not exists(select 1 from public.ay2_settings where site_id=s and initialized and opening_date<period_end) then raise exception 'Açılış kaydı gerekli.'; end if;
  select opening_cents into opening from public.ay2_settings where site_id=s;
  opening:=opening+coalesce((select sum(cents) from public.ay2_entries where site_id=s and booked_on<period_start),0);
  select coalesce(sum(cents) filter(where cents>0),0),coalesce(-sum(cents) filter(where cents<0),0) into income,expense from public.ay2_entries where site_id=s and booked_on>=period_start and booked_on<period_end;
  insert into public.ay2_reports(site_id,period,opening_cents,income_cents,expense_cents,closing_cents,source_last_date,published_by)
  values(s,period_start,opening,income,expense,opening+income-expense,(select max(booked_on) from public.ay2_entries where site_id=s and booked_on<period_end),auth.uid())
  on conflict(site_id,period) do update set opening_cents=excluded.opening_cents,income_cents=excluded.income_cents,expense_cents=excluded.expense_cents,closing_cents=excluded.closing_cents,source_last_date=excluded.source_last_date,published_at=now(),published_by=excluded.published_by;
 elsif act='confirm_staged' then
  select * into original from public.ay2_staged_charges where site_id=s and id=(p->>'id')::uuid for update;
  if not found or original.confirmed_charge is not null or original.ignored_reason is not null then raise exception 'Bekleyen kayıt bulunamadı.'; end if;
  if p->>'ignore_reason' is not null then
   if length(btrim(p->>'ignore_reason'))<3 then raise exception 'Gerekçe gerekli.'; end if;
   update public.ay2_staged_charges set ignored_reason=p->>'ignore_reason' where id=original.id;
  else
   insert into public.ay2_charges(site_id,unit_id,category,label,due_on,cents,payer,reference,created_by)
   values(s,(p->>'unit_id')::uuid,case when original.kind='enforcement' then 'İcra' else 'Devir' end,'Devir bakiyesi · '||original.as_of,original.as_of,original.cents,p->>'payer','staged:'||original.id,auth.uid()) returning id into ident;
   update public.ay2_staged_charges set confirmed_charge=ident where id=original.id;
  end if;
 else raise exception 'Bilinmeyen işlem.';
 end if;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(s,auth.uid(),act,ident,jsonb_build_object('reason',p->>'reason','result',result));
 return coalesce(result,jsonb_build_object('id',ident,'ok',true));
end;
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.view_charge(c uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and exists(select 1 from public.ay2_charges x where x.id=c and (ay2_private.can(x.site_id,'finance') or ay2_private.own_person(x.person_id)));
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.own_person(p uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and exists(select 1 from public.ay3_persons where id=p and auth_user_id=auth.uid());
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.financial_summary(s uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 begin
 if auth.uid() is null or not ay2_private.view_site(s) then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 return jsonb_build_object('source_last_date',(select max(booked_on) from public.ay2_entries where site_id=s),
 'opening_cents',(select opening_cents from public.ay2_settings where site_id=s and initialized),
 'balance_cents',(select opening_cents+coalesce((select sum(cents) from public.ay2_entries where site_id=s),0) from public.ay2_settings where site_id=s and initialized),
 'days',coalesce((select jsonb_agg(jsonb_build_object('date',d.booked_on,'income_cents',d.inc,'expense_cents',d.exp,'categories',d.cats) order by d.booked_on) from (
 select booked_on,sum(inc) inc,sum(exp) exp,jsonb_object_agg(category,exp) cats from (
 select e.booked_on,e.category,coalesce(sum(e.cents) filter(where e.cents>0),0) inc,coalesce(-sum(e.cents) filter(where e.cents<0),0) exp
 from public.ay2_entries e where e.site_id=s and e.reversal_of is null and e.category<>'Transfer' and not exists(select 1 from public.ay2_entries r where r.reversal_of=e.id)
 group by e.booked_on,e.category) bycat group by booked_on) d),'[]'::jsonb));end;
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.finance_people(s uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select case when auth.uid() is not null and ay2_private.can(s,'finance') then coalesce((select jsonb_agg(jsonb_build_object('id',id,'full_name',full_name)) from public.ay3_persons where site_id=s),'[]'::jsonb) else '[]'::jsonb end;
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.command(s uuid, act text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ident uuid;pid uuid;uid uuid;l public.ay3_links;c public.ay2_charges;e public.ay2_entries;cr public.ay3_credits;
 need text;res jsonb;label text;amount bigint;available bigint;used bigint;previous uuid;item jsonb;filtered jsonb:='[]'::jsonb;duplicates int:=0;start_date date;end_date date;created timestamptz:=now();
begin
 if auth.uid() is null then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 if act in ('assignment_add','assignment_edit','assignment_remove','assignment_restore') then return ay2_private.manage_assignment(s,act,p);end if;
 if act='link' then return ay2_private.manage_assignment(s,'assignment_add',p);end if;
 if act='edit_link' then return ay2_private.manage_assignment(s,'assignment_edit',p);end if;
 if act='end_link' then return ay2_private.manage_assignment(s,'assignment_remove',p||jsonb_build_object('reason','ended'));end if;
 if act='unlink' then return ay2_private.unlink_relationship(s,p);end if;
 if act in ('relationship_change','switch_tenant') then return ay2_private.change_relationship(s,p);end if;
 if act='acknowledge' then
  if not ay2_private.view_site(s) then raise exception 'Yetkiniz yok.' using errcode='42501';end if;
  insert into public.ay3_acknowledgements(site_id,announcement_id,user_id,revision)
  select s,id,auth.uid(),revision from public.ay2_announcements where site_id=s and id=(p->>'id')::uuid and published and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()) on conflict do nothing;
  return jsonb_build_object('ok',true);
 end if;
 need:=case when act in ('person','link','edit_link','occupancy','end_link','switch_tenant','provider','provider_note') then 'people' when act='announcement' then 'announcements' when act='match_rule' then 'finance' else null end;
 if need is not null and not ay2_private.can(s,need) then raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(s::text,0));
 if act='occupancy' then
  if coalesce(p->>'status','') not in ('occupied','vacant','unknown') then raise exception 'Geçerli bir kullanım durumu seçin.';end if;
  update public.site_units set occupancy_status=p->>'status' where site_id=s and id=(p->>'unit_id')::uuid returning id into ident;
  if not found then raise exception 'Daire bulunamadı.';end if;
 elsif act='edit_link' then
  select * into l from public.ay3_links where site_id=s and id=(p->>'id')::uuid for update;
  if not found then raise exception 'Bağlantı bulunamadı.';end if;
  start_date:=nullif(p->>'starts_on','')::date;end_date:=nullif(p->>'ends_on','')::date;
  -- Empty start is intentionally unknown.
  if end_date is not null and start_date is not null and end_date<start_date then raise exception 'Çıkış tarihi başlangıç tarihinden önce olamaz.';end if;
  if exists(select 1 from public.ay3_links t where t.site_id=s and t.unit_id=l.unit_id and t.id<>l.id and (t.person_id=l.person_id and t.role=l.role or t.role='tenant' and l.role='tenant') and daterange(t.starts_on,t.ends_on,'[]')&&daterange(start_date,end_date,'[]')) then raise exception 'Bu tarih aralığı başka bir belegeyle çakışıyor.';end if;
  insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(s,auth.uid(),'edit_link_before',l.id,jsonb_build_object('starts_on',l.starts_on,'ends_on',l.ends_on));
  update public.ay3_links set starts_on=start_date where id=l.id;
  if end_date is not null then perform ay2_private.command(s,'end_link',jsonb_build_object('id',l.id,'ends_on',end_date));else update public.ay3_links set ends_on=null where id=l.id;end if;
  if l.role in ('owner','tenant') then perform ay2_private.assert_tenant_owner_coverage(s,l.unit_id);end if;
  ident:=l.id;
 elsif act='person' then
  if length(btrim(coalesce(p->>'first_name','')))=0 or length(btrim(coalesce(p->>'last_name','')))=0 then raise exception 'Ad ve soyad gerekli.';end if;
  ident:=nullif(p->>'person_id','')::uuid;
  if nullif(p->>'auth_user_id','') is not null and not ay2_private.can(s,'admin') then raise exception 'Hesap bağlantısını yalnızca Süper Admin yapabilir.';end if;
  uid:=nullif(p->>'auth_user_id','')::uuid;
  if uid is not null and not exists(select 1 from public.site_resident_units r join public.site_units u on u.id=r.unit_id where u.site_id=s and r.user_id=uid and r.active) then raise exception 'Bu siteye kayıtlı bir kullanıcı seçin.';end if;
  if ident is null then
   insert into public.ay3_persons(site_id,full_name,first_name,last_name,phone,email,language,notes,auth_user_id) values(s,btrim((p->>'first_name')||' '||(p->>'last_name')),p->>'first_name',p->>'last_name',coalesce(p->>'phone',''),coalesce(p->>'email',''),coalesce(p->>'language','tr'),coalesce(p->>'notes',''),uid) returning id into ident;
  else
   update public.ay3_persons set full_name=btrim((p->>'first_name')||' '||(p->>'last_name')),first_name=p->>'first_name',last_name=p->>'last_name',phone=coalesce(p->>'phone',''),email=coalesce(p->>'email',''),language=coalesce(p->>'language','tr'),notes=coalesce(p->>'notes',''),auth_user_id=case when ay2_private.can(s,'admin') then uid else auth_user_id end where site_id=s and id=ident;
   if not found then raise exception 'Kişi bulunamadı.';end if;
  end if;
  if nullif(p->>'unit_id','') is not null then perform ay2_private.command(s,'link',p||jsonb_build_object('person_id',ident));end if;
 elsif act='link' then
  pid:=(p->>'person_id')::uuid;uid:=(p->>'unit_id')::uuid;start_date:=nullif(p->>'starts_on','')::date;end_date:=nullif(p->>'ends_on','')::date;
  if end_date is not null and end_date<start_date then raise exception 'Tarih aralığını kontrol edin.';end if;
  -- Empty start is intentionally unknown.

  if exists(select 1 from public.ay3_links where site_id=s and unit_id=uid and person_id=pid and role=p->>'role' and daterange(starts_on,ends_on,'[]')&&daterange(start_date,end_date,'[]')) then raise exception 'Bu kişi zaten bu dönem için bağlı.';end if;
  if p->>'role'='tenant' and exists(select 1 from public.ay3_links where site_id=s and unit_id=uid and role='tenant' and daterange(starts_on,ends_on,'[]')&&daterange(start_date,end_date,'[]')) then raise exception 'Bu tarihlerde başka bir kiracı var. Sakin değiştir seçeneğini kullanın.';end if;
  insert into public.ay3_links(site_id,person_id,unit_id,role,starts_on,ends_on,responsibility,primary_contact) values(s,pid,uid,p->>'role',start_date,end_date,coalesce(p->>'responsibility',''),coalesce((p->>'primary_contact')::boolean,false)) returning id into ident;
  if p->>'role'='tenant' then perform ay2_private.assert_tenant_owner_coverage(s,uid);end if;
 elsif act='end_link' then
  select * into l from public.ay3_links where site_id=s and id=(p->>'id')::uuid for update;
  if not found then raise exception 'Bağlantı bulunamadı.';end if;
  end_date:=coalesce(nullif(p->>'ends_on','')::date,(now() at time zone 'Europe/Istanbul')::date);
  if l.starts_on is not null and end_date<l.starts_on then raise exception 'Çıkış tarihi başlangıç tarihinden önce olamaz.';end if;
  if l.role='owner' and exists(select 1 from public.ay3_links t where t.site_id=s and t.unit_id=l.unit_id and t.role='tenant' and (t.ends_on is null or t.ends_on>end_date)) and not exists(select 1 from public.ay3_links o where o.site_id=s and o.unit_id=l.unit_id and o.role='owner' and o.id<>l.id and o.starts_on<=end_date+1 and o.ends_on is null) then raise exception 'Önce yeni ev sahibini ekleyin veya diğer bağlantıları bitirin.';end if;
  update public.ay3_links set ends_on=end_date where site_id=s and id=(p->>'id')::uuid returning id into ident;
  if not found then raise exception 'Bağlantı bulunamadı.';end if;
 elsif act='switch_tenant' then
  if not coalesce((p->>'confirmation')::boolean,false) then raise exception 'Onay gerekli.';end if;
  select * into l from public.ay3_links where site_id=s and id=(p->>'id')::uuid and role='tenant' for update;
  if not found or l.ends_on is not null then raise exception 'Aktif kiracı bulunamadı.';end if;
  end_date:=coalesce(nullif(p->>'ends_on','')::date,(now() at time zone 'Europe/Istanbul')::date);start_date:=coalesce(nullif(p->>'starts_on','')::date,end_date+1);
  if l.starts_on is not null and end_date<l.starts_on then raise exception 'Çıkış tarihi başlangıç tarihinden önce olamaz.';end if;
  if end_date is null or start_date is null or start_date<=end_date then raise exception 'Yeni başlangıç çıkış tarihinden sonra olmalı.';end if;
  update public.ay3_links set ends_on=end_date where id=l.id;
  if nullif(p->>'person_id','') is null then res:=ay2_private.command(s,'person',(p-'unit_id'-'person_id'-'id')||jsonb_build_object('language','tr'));p:=p||jsonb_build_object('person_id',res->>'id');end if;
  res:=ay2_private.command(s,'link',p||jsonb_build_object('role','tenant','unit_id',l.unit_id,'ends_on',null,'starts_on',start_date,'start_unknown',false));ident:=(res->>'id')::uuid;
 elsif act='announcement' then
  select coalesce(nullif(raw_user_meta_data->>'full_name',''),nullif(raw_user_meta_data->>'name',''),'Yönetim') into label from auth.users where id=auth.uid();
  ident:=nullif(p->>'id','')::uuid;
  if ident is null then
   insert into public.ay2_announcements(site_id,title,body,published,priority,starts_at,ends_at,author_label,created_by) values(s,p->>'title',p->>'body',coalesce((p->>'published')::boolean,false),coalesce(p->>'priority','normal'),nullif(p->>'starts_at','')::timestamptz,nullif(p->>'ends_at','')::timestamptz,coalesce(label,'Yönetim'),auth.uid()) returning id into ident;
  else
   update public.ay2_announcements set title=p->>'title',body=p->>'body',published=coalesce((p->>'published')::boolean,false),priority=coalesce(p->>'priority','normal'),starts_at=nullif(p->>'starts_at','')::timestamptz,ends_at=nullif(p->>'ends_at','')::timestamptz,updated_by=auth.uid(),updated_at=now(),revision=revision+1 where site_id=s and id=ident;
   if not found then raise exception 'Duyuru bulunamadı.';end if;
  end if;
 elsif act='provider' then
  ident:=nullif(p->>'id','')::uuid;
  if ident is null then insert into public.ay3_providers(site_id,name,category,contact,phone,email,status,created_by) values(s,p->>'name',p->>'category',coalesce(p->>'contact',''),coalesce(p->>'phone',''),coalesce(p->>'email',''),coalesce(p->>'status','preferred'),auth.uid()) returning id into ident;
  else update public.ay3_providers set name=p->>'name',category=p->>'category',contact=coalesce(p->>'contact',''),phone=coalesce(p->>'phone',''),email=coalesce(p->>'email',''),status=p->>'status' where site_id=s and id=ident;if not found then raise exception 'Kayıt bulunamadı.';end if;end if;
 elsif act='provider_note' then
  select coalesce(nullif(raw_user_meta_data->>'full_name',''),'Yönetim') into label from auth.users where id=auth.uid();
  if length(btrim(coalesce(p->>'body','')))=0 then raise exception 'Not yazın.';end if;
  ident:=nullif(p->>'id','')::uuid;
  if ident is null then
   insert into public.ay3_provider_notes(site_id,provider_id,body,visit_on,created_by,author_label) values(s,(p->>'provider_id')::uuid,p->>'body',nullif(p->>'visit_on','')::date,auth.uid(),coalesce(label,'Yönetim')) returning id into ident;
  else
   perform 1 from public.ay3_provider_notes where site_id=s and id=ident and provider_id=(p->>'provider_id')::uuid for update;
   if not found then raise exception 'Not bulunamadı.';end if;
   insert into public.ay2_audit(site_id,actor,action,entity_id,details)
   select s,auth.uid(),'provider_note_edit_before',id,jsonb_build_object('body',body,'visit_on',visit_on,'author_label',author_label) from public.ay3_provider_notes where site_id=s and id=ident;
   update public.ay3_provider_notes set body=p->>'body',visit_on=nullif(p->>'visit_on','')::date where site_id=s and id=ident and provider_id=(p->>'provider_id')::uuid;
  end if;
 elsif act='match_rule' then
  if not exists(select 1 from public.ay3_links where site_id=s and unit_id=(p->>'unit_id')::uuid and person_id=(p->>'person_id')::uuid) then raise exception 'Kişi bu daireye bağlı değil.';end if;
  insert into public.ay3_match_rules(site_id,unit_id,person_id,alias,iban,created_by) values(s,(p->>'unit_id')::uuid,(p->>'person_id')::uuid,btrim(coalesce(p->>'alias','')),upper(replace(coalesce(p->>'iban',''),' ','')),auth.uid()) returning id into ident;
 elsif act in ('credit','void_credit','bind_charge','classify_entry') then
  if not ay2_private.can(s,'finance') then raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501';end if;
  if act='classify_entry' then
   if p->>'category' is null or length(p->>'category') not between 1 and 80 then raise exception 'Kategori seçin.';end if;
   update public.ay2_entries set category=p->>'category' where site_id=s and id=(p->>'id')::uuid returning id into ident;
   if not found then raise exception 'Kayıt bulunamadı.';end if;
  elsif act='credit' then
   select * into cr from public.ay3_credits where site_id=s and request_id=(p->>'request_id')::uuid;
   if found then
    if cr.entry_id is distinct from (p->>'entry_id')::uuid or cr.person_id is distinct from (p->>'person_id')::uuid or cr.unit_id is distinct from (p->>'unit_id')::uuid or cr.cents is distinct from (p->>'cents')::bigint then raise exception 'Bu istek farklı değerlerle kaydedildi.';end if;
    return jsonb_build_object('id',cr.id,'already_recorded',true);
   end if;
   select * into e from public.ay2_entries where site_id=s and id=(p->>'entry_id')::uuid;
   if not found or e.cents<0 or e.reversal_of is not null or exists(select 1 from public.ay2_entries where reversal_of=e.id) then raise exception 'Geçerli tahsilat bulunamadı.';end if;
   if not exists(select 1 from public.ay3_links where site_id=s and unit_id=(p->>'unit_id')::uuid and person_id=(p->>'person_id')::uuid) then raise exception 'Kişi bu daireye bağlı değil.';end if;
   select e.cents-coalesce((select sum(cents) from public.ay2_allocations where entry_id=e.id and void_reason is null),0)-coalesce((select sum(cents) from public.ay3_credits where entry_id=e.id and void_reason is null),0) into available;
   amount:=(p->>'cents')::bigint;if amount is null or amount<=0 or amount>available then raise exception 'Tutar ödeme bakiyesini aşıyor.';end if;
   insert into public.ay3_credits(site_id,entry_id,unit_id,person_id,cents,request_id,created_by) values(s,e.id,(p->>'unit_id')::uuid,(p->>'person_id')::uuid,amount,(p->>'request_id')::uuid,auth.uid()) returning id into ident;
  elsif act='void_credit' then
   if length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'Gerekçe gerekli.';end if;
   update public.ay3_credits set void_reason=p->>'reason' where site_id=s and id=(p->>'id')::uuid and void_reason is null returning id into ident;
   if not found then raise exception 'Guthaben bulunamadı.';end if;
  else
   select * into c from public.ay2_charges where site_id=s and id=(p->>'id')::uuid;
   if not found or c.person_id is not null then raise exception 'Sorumlu kişi zaten belirlenmiş.';end if;
   select * into l from public.ay3_links where site_id=s and id=(p->>'link_id')::uuid and unit_id=c.unit_id;
   if not found then raise exception 'Daireye bağlı kişi seçin.';end if;
   update public.ay2_charges set person_id=l.person_id,link_id=l.id where id=c.id;ident:=c.id;
  end if;
 else
  if act='import' then
   if not ay2_private.can(s,'import') then raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501';end if;
   if jsonb_typeof(p->'entries') is distinct from 'array' or jsonb_array_length(p->'entries') not between 1 and 2000 then raise exception '1–2000 hareket gerekli.';end if;
   for item in select value from jsonb_array_elements(p->'entries') loop
    if exists(select 1 from public.ay2_entries where site_id=s and booked_on=(item->>'date')::date and cents=(item->>'cents')::bigint and bank_reference=coalesce(item->>'reference','') and (description=btrim(item->>'desc') or coalesce(item->>'reference','')<>'')) then duplicates:=duplicates+1;
    else filtered:=filtered||jsonb_build_array(item);end if;
   end loop;
   if jsonb_array_length(filtered)=0 then return jsonb_build_object('inserted',0,'duplicates',duplicates);end if;
   res:=ay2_private.command_v2(s,act,p||jsonb_build_object('entries',filtered));
   for item in select value from jsonb_array_elements(filtered) loop
    update public.ay2_entries set sender_name=coalesce(item->>'counterparty',''),sender_iban=coalesce(item->>'iban',''),unit_hint=coalesce(item->>'unit_hint','') where site_id=s and booked_on=(item->>'date')::date and cents=(item->>'cents')::bigint and bank_reference=coalesce(item->>'reference','') and description=btrim(item->>'desc') and batch_id in (select id from public.ay2_batches where site_id=s and digest=p->>'digest');
   end loop;
   return res||jsonb_build_object('duplicates',coalesce((res->>'duplicates')::int,0)+duplicates);
  end if;
  if act='allocate' then
   select * into e from public.ay2_entries where site_id=s and id=(p->>'entry_id')::uuid;
   select coalesce(sum(cents),0) into used from public.ay3_credits where entry_id=e.id and void_reason is null;
   if used>0 and (p->>'cents')::bigint>e.cents-used-coalesce((select sum(cents) from public.ay2_allocations where entry_id=e.id and void_reason is null),0) then raise exception 'Önce ayrılmış fazla ödemeyi kaldırın.';end if;
  elsif act='reverse' and exists(select 1 from public.ay3_credits where site_id=s and entry_id=(p->>'id')::uuid and void_reason is null) then raise exception 'Önce fazla ödeme kaydını kaldırın.';
  end if;
  if act in ('charge','confirm_staged') and nullif(p->>'link_id','') is not null and not exists(select 1 from public.ay3_links where id=(p->>'link_id')::uuid and site_id=s and unit_id=(p->>'unit_id')::uuid) then raise exception 'Daireye bağlı kişi seçin.';end if;
  res:=ay2_private.command_v2(s,act,p);
  if act in ('charge','confirm_staged') and nullif(res->>'id','') is not null then
   ident:=(res->>'id')::uuid;
   select * into c from public.ay2_charges where id=ident;
   select * into l from public.ay3_links where site_id=s and unit_id=c.unit_id and id=nullif(p->>'link_id','')::uuid;
   start_date:=nullif(p->>'period_from','')::date;
   end_date:=nullif(p->>'period_to','')::date;
   if (start_date is null) <> (end_date is null) or end_date<start_date then
    raise exception 'Borç döneminin başlangıç ve bitiş tarihlerini kontrol edin.';
   end if;
   update public.ay2_charges set period_from=start_date,period_to=end_date where id=ident and site_id=s;
   if l.id is not null then update public.ay2_charges set person_id=l.person_id,link_id=l.id where id=ident and site_id=s;end if;
  elsif act='monthly' then
   for c in select * from public.ay2_charges where site_id=s and reference='monthly:'||date_trunc('month',(p->>'due_on')::date)::date and person_id is null loop
    select * into l from public.ay3_links where site_id=s and unit_id=c.unit_id and active and role=case c.payer when 'owner' then 'owner' when 'tenant' then 'tenant' else '' end and starts_on<=c.due_on and (ends_on is null or ends_on>=c.due_on);
    if found and (select count(*) from public.ay3_links where site_id=s and unit_id=c.unit_id and active and role=l.role and starts_on<=c.due_on and (ends_on is null or ends_on>=c.due_on))=1 then update public.ay2_charges set person_id=l.person_id,link_id=l.id,period_from=date_trunc('month',c.due_on)::date,period_to=(date_trunc('month',c.due_on)+interval '1 month - 1 day')::date where id=c.id;end if;
   end loop;
  end if;
  return res;
 end if;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(s,auth.uid(),act,ident,jsonb_build_object('reason',p->>'reason'));
 return jsonb_build_object('id',ident,'ok',true);
end;
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.access_target(p_actor uuid, p_person uuid, p_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.ay3_persons; u uuid;
begin
 select * into p from public.ay3_persons where id=p_person;
 if p.id is null or not exists(select 1 from public.site_staff_memberships where site_id=p.site_id and user_id=p_actor and role='manager') then raise exception 'Access denied' using errcode='42501'; end if;
 if p_role not in ('resident','deputy','manager') or coalesce(p.email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Person or role incomplete';end if;
 if p_role='resident' and not exists(select 1 from public.ay3_links where person_id=p.id and site_id=p.site_id and role in ('owner','tenant') and active) then raise exception 'Current apartment required';end if;
 select id into u from auth.users where lower(email)=lower(btrim(p.email));
 if p.auth_user_id is not null and p.auth_user_id is distinct from u then raise exception 'Account mismatch';end if;
 return jsonb_build_object('email',lower(btrim(p.email)),'user_id',u);
end;$function$
;
CREATE OR REPLACE FUNCTION ay2_private.record_occupancy(s uuid, u uuid, d date, v text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(s,'people') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING errcode='42501';END IF;
 IF d IS NULL OR v IS NULL OR v NOT IN ('occupied','vacant','unknown') THEN RAISE EXCEPTION 'Geçerli bir kullanım durumu seçin.';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.site_units WHERE id=u AND site_id=s) THEN RAISE EXCEPTION 'Daire bulunamadı.';END IF;
 INSERT INTO public.ay3_occupancy_changes(site_id,unit_id,effective_on,status,created_by)
 VALUES(s,u,d,v,auth.uid()) ON CONFLICT(site_id,unit_id,effective_on)
 DO UPDATE SET status=excluded.status,created_by=excluded.created_by,created_at=now();
END;$function$
;
CREATE OR REPLACE FUNCTION ay2_private.provider_directory(s uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not ay2_private.view_site(s) then raise exception 'Yetkiniz yok.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'category',p.category,'contact',p.contact,'phone',p.phone,'email',p.email,'status',p.status) order by p.name) from public.ay3_providers p where p.site_id=s and p.status<>'avoid'),'[]'::jsonb);
end;$function$
;
CREATE OR REPLACE FUNCTION ay2_private.change_relationship(s uuid, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(s,'people') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING errcode='42501';END IF;
 RAISE EXCEPTION 'Eski form artık kullanılmıyor. Sayfayı yenileyip Kişi ekle veya Düzenle seçin.';
END;$function$
;
CREATE OR REPLACE FUNCTION ay2_private.assert_tenant_owner_coverage(p_site uuid, p_unit uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE owner_periods datemultirange;
BEGIN
 SELECT range_agg(daterange(starts_on,ends_on,'[]')) INTO owner_periods
 FROM public.ay3_links WHERE site_id=p_site AND unit_id=p_unit AND role='owner';
 IF EXISTS(SELECT 1 FROM public.ay3_links t
  WHERE t.site_id=p_site AND t.unit_id=p_unit AND t.role='tenant'
  AND NOT coalesce(owner_periods @> daterange(t.starts_on,t.ends_on,'[]'),false)) THEN
  RAISE EXCEPTION 'Bu dönemin tamamı için ev sahibi kaydı gerekli. Önce ev sahibi bilgisini kontrol edin.';
 END IF;
END;$function$
;
CREATE OR REPLACE FUNCTION ay2_private.manage_assignment(s uuid, act text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 req uuid:=nullif(p->>'request_id','')::uuid;l public.ay3_links;old public.ay3_links;
 pid uuid;u uuid;ident uuid;existing uuid;r text;extra text;d1 date;d2 date;
 cached jsonb;result jsonb;before_person jsonb;role_changed boolean:=false;
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(s,'people') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING errcode='42501';END IF;
 IF act NOT IN ('assignment_add','assignment_edit','assignment_remove','assignment_restore') OR act IS NULL THEN RAISE EXCEPTION 'Geçersiz kişi işlemi.';END IF;
 IF req IS NULL THEN RAISE EXCEPTION 'İstek kimliği gerekli.';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
 SELECT details INTO cached FROM public.ay2_audit WHERE site_id=s AND action=act AND details->>'request_id'=req::text LIMIT 1;
 IF FOUND THEN
  IF cached->'payload' IS DISTINCT FROM p THEN RAISE EXCEPTION 'Bu istek farklı değerlerle kaydedildi.';END IF;
  RETURN cached->'result'||jsonb_build_object('already_recorded',true);
 END IF;
 IF act<>'assignment_add' THEN
  SELECT * INTO l FROM public.ay3_links WHERE site_id=s AND id=nullif(p->>'id','')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kayıt bulunamadı.';END IF;old:=l;pid:=l.person_id;u:=l.unit_id;ident:=l.id;
  IF p ? 'revision' AND (p->>'revision')::bigint IS DISTINCT FROM l.revision THEN RAISE EXCEPTION 'Kayıt değişti. Görünümü yenileyip tekrar deneyin.';END IF;
 ELSE u:=nullif(p->>'unit_id','')::uuid;pid:=nullif(p->>'person_id','')::uuid;END IF;
 IF NOT EXISTS(SELECT 1 FROM public.site_units WHERE id=u AND site_id=s) THEN RAISE EXCEPTION 'Daire bulunamadı.';END IF;
 IF act='assignment_edit' AND NOT l.active THEN RAISE EXCEPTION 'Bu rol arşivde. Önce geri getirin.';END IF;
 IF act='assignment_remove' THEN
  IF coalesce(p->>'reason','') NOT IN ('mistake','ended','other') THEN RAISE EXCEPTION 'Kaldırma nedenini seçin.';END IF;
  IF length(coalesce(p->>'note',''))>500 THEN RAISE EXCEPTION 'Not en fazla 500 karakter olabilir.';END IF;
  UPDATE public.ay3_links SET active=false,archived_at=now(),archive_reason=p->>'reason',archive_note=coalesce(p->>'note',''),updated_at=now(),revision=revision+1 WHERE id=l.id AND site_id=s;
 ELSE
  IF act='assignment_restore' THEN r:=l.role;d1:=l.starts_on;d2:=l.ends_on;
  ELSE
   r:=coalesce(nullif(p->>'role',''),l.role);d1:=CASE WHEN p ? 'starts_on' THEN nullif(p->>'starts_on','')::date ELSE l.starts_on END;d2:=CASE WHEN p ? 'ends_on' THEN nullif(p->>'ends_on','')::date ELSE l.ends_on END;
   IF d2<d1 THEN RAISE EXCEPTION 'Bitiş tarihi başlangıç tarihinden önce olamaz.';END IF;
   IF r IS NULL OR r NOT IN ('owner','tenant','representative') THEN RAISE EXCEPTION 'Geçerli bir rol seçin.';END IF;
   IF act='assignment_add' AND coalesce((p->>'new_person')::boolean,false) THEN
    IF length(btrim(coalesce(p->>'first_name','')))=0 OR length(btrim(coalesce(p->>'last_name','')))=0 THEN RAISE EXCEPTION 'Ad ve soyad gerekli.';END IF;
    IF length(p->>'first_name')>75 OR length(p->>'last_name')>75 OR length(coalesce(p->>'phone',''))>60 OR length(coalesce(p->>'email',''))>254 OR length(coalesce(p->>'notes',''))>5000 THEN RAISE EXCEPTION 'Kişi bilgileri çok uzun.';END IF;
    INSERT INTO public.ay3_persons(site_id,first_name,last_name,full_name,phone,email,notes,language)
    VALUES(s,btrim(p->>'first_name'),btrim(p->>'last_name'),btrim(p->>'first_name')||' '||btrim(p->>'last_name'),coalesce(p->>'phone',''),coalesce(p->>'email',''),coalesce(p->>'notes',''),'tr') RETURNING id INTO pid;
   END IF;
   SELECT to_jsonb(t) INTO before_person FROM public.ay3_persons t WHERE id=pid AND site_id=s FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Kişi seçin.';END IF;
   IF act='assignment_edit' AND (p ? 'first_name' OR p ? 'last_name' OR p ? 'phone' OR p ? 'email' OR p ? 'notes') THEN
    IF length(btrim(coalesce(p->>'first_name',before_person->>'first_name')))=0 OR length(btrim(coalesce(p->>'last_name',before_person->>'last_name')))=0 THEN RAISE EXCEPTION 'Ad ve soyad gerekli.';END IF;
    IF length(coalesce(p->>'first_name',''))>75 OR length(coalesce(p->>'last_name',''))>75 OR length(coalesce(p->>'phone',''))>60 OR length(coalesce(p->>'email',''))>254 OR length(coalesce(p->>'notes',''))>5000 THEN RAISE EXCEPTION 'Kişi bilgileri çok uzun.';END IF;
    UPDATE public.ay3_persons SET first_name=btrim(coalesce(p->>'first_name',first_name)),last_name=btrim(coalesce(p->>'last_name',last_name)),
     full_name=btrim(coalesce(p->>'first_name',first_name))||' '||btrim(coalesce(p->>'last_name',last_name)),
     phone=coalesce(p->>'phone',phone),email=coalesce(p->>'email',email),notes=coalesce(p->>'notes',notes) WHERE id=pid AND site_id=s;
   END IF;
  END IF;
  IF act='assignment_edit' AND l.role=r THEN
   UPDATE public.ay3_links SET starts_on=d1,ends_on=d2,updated_at=now(),revision=revision+1 WHERE id=l.id AND site_id=s;
  ELSE
   IF act='assignment_edit' THEN
    IF NOT l.active THEN RAISE EXCEPTION 'Bu rol arşivde. Önce geri getirin.';END IF;
    UPDATE public.ay3_links SET active=false,archived_at=now(),archive_reason='role_changed',updated_at=now(),revision=revision+1 WHERE id=l.id AND site_id=s;
   END IF;
   SELECT id INTO existing FROM public.ay3_links WHERE site_id=s AND unit_id=u AND person_id=pid AND role=r AND active ORDER BY id LIMIT 1;
   IF existing IS NOT NULL THEN ident:=existing;
   ELSE
    INSERT INTO public.ay3_links(site_id,unit_id,person_id,role,starts_on,ends_on,active,responsibility,primary_contact)
    VALUES(s,u,pid,r,d1,d2,true,coalesce(l.responsibility,''),coalesce(l.primary_contact,false)) RETURNING id INTO ident;
   END IF;
  END IF;
  extra:=nullif(p->>'additional_role','');
  IF extra IS NOT NULL THEN
   IF extra NOT IN ('owner','tenant','representative') THEN RAISE EXCEPTION 'Geçerli bir rol seçin.';END IF;
   IF NOT EXISTS(SELECT 1 FROM public.ay3_links WHERE site_id=s AND unit_id=u AND person_id=pid AND role=extra AND active) THEN
    INSERT INTO public.ay3_links(site_id,unit_id,person_id,role,starts_on,ends_on,active) VALUES(s,u,pid,extra,d1,d2,true);
   END IF;
  END IF;
 END IF;
 result:=jsonb_build_object('ok',true,'id',ident);
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(s,auth.uid(),act,ident,jsonb_build_object('request_id',req,'payload',p,'before',to_jsonb(old),'person_before',before_person,'result',result));
 RETURN result;
END;$function$
;
CREATE OR REPLACE FUNCTION ay2_private.unlink_relationship(s uuid, p jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 SELECT ay2_private.manage_assignment(s,'assignment_remove',(p-'reason')||jsonb_build_object('reason','mistake','note',p->>'reason'));
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.review_sources(s uuid)
 RETURNS TABLE(kind text, source_id uuid, fingerprint text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 WITH allocations AS MATERIALIZED (
  SELECT a.entry_id,jsonb_agg(a ORDER BY a.id)::text payload
  FROM public.ay2_allocations a WHERE a.site_id=s GROUP BY a.entry_id
 ), credits AS MATERIALIZED (
  SELECT c.entry_id,jsonb_agg(c ORDER BY c.id)::text payload
  FROM public.ay3_credits c WHERE c.site_id=s GROUP BY c.entry_id
 ), reversals AS MATERIALIZED (
  SELECT r.reversal_of,jsonb_agg(r ORDER BY r.id)::text payload
  FROM public.ay2_entries r WHERE r.site_id=s AND r.reversal_of IS NOT NULL GROUP BY r.reversal_of
 )
 SELECT 'stage',t.id,md5(to_jsonb(t)::text)
 FROM public.ay2_staged_charges t WHERE t.site_id=s AND t.confirmed_charge IS NULL AND t.ignored_reason IS NULL
 UNION ALL
 SELECT 'payment',t.id,md5(to_jsonb(t)::text||coalesce(a.payload,'[]')||coalesce(c.payload,'[]')||coalesce(r.payload,'[]'))
 FROM public.ay2_entries t
 LEFT JOIN allocations a ON a.entry_id=t.id
 LEFT JOIN credits c ON c.entry_id=t.id
 LEFT JOIN reversals r ON r.reversal_of=t.id
 WHERE t.site_id=s AND t.cents>0 AND t.reversal_of IS NULL;
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.review_selected(s uuid, items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE item jsonb;f text;uid uuid;sid uuid;affected uuid;total integer:=0;sources jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(s,'finance') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING ERRCODE='42501';END IF;
 IF jsonb_typeof(items)<>'array' OR jsonb_array_length(items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Select 1 to 100 items';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
 SELECT jsonb_object_agg(kind||':'||source_id,fingerprint) INTO sources FROM ay2_private.review_sources(s); FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP
  uid:=(item->>'unit_id')::uuid;sid:=(item->>'source_id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.site_units WHERE id=uid AND site_id=s) THEN RAISE EXCEPTION 'Invalid apartment';END IF;
  f:=sources->>((item->>'kind')||':'||sid);
  IF f IS NULL OR f IS DISTINCT FROM item->>'fingerprint' THEN RAISE EXCEPTION 'Kayıt değişti. Yenileyip tekrar kontrol edin.';END IF;
  INSERT INTO public.ay3_review_receipts(site_id,unit_id,kind,source_id,fingerprint,actor) VALUES(s,uid,item->>'kind',sid,f,auth.uid()) ON CONFLICT DO NOTHING RETURNING id INTO affected;
  IF affected IS NOT NULL THEN
   INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(s,auth.uid(),'review_checked',affected,jsonb_build_object('kind',item->>'kind','source_id',sid,'unit_id',uid,'fingerprint',f));total:=total+1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('ok',true,'count',total);
END;$function$
;
CREATE OR REPLACE FUNCTION ay2_private.staff_directory(s uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(s,'admin') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING ERRCODE='42501';END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'name',coalesce(p.full_name,nullif(u.raw_user_meta_data->>'full_name',''),''),'email',u.email) ORDER BY m.role,m.user_id)
 FROM public.site_staff_memberships m JOIN auth.users u ON u.id=m.user_id LEFT JOIN LATERAL(SELECT full_name FROM public.ay3_persons WHERE site_id=s AND auth_user_id=m.user_id ORDER BY created_at,id LIMIT 1) p ON true WHERE m.site_id=s),'[]'::jsonb);
END;$function$
;
CREATE OR REPLACE FUNCTION ay2_private.prepare_access_person(p_actor uuid, s uuid, first_name text, last_name text, email text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE ident uuid;em text:=lower(btrim(email));
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE site_id=s AND user_id=p_actor AND role='manager') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501';END IF;
 IF length(btrim(first_name)) NOT BETWEEN 1 AND 75 OR length(btrim(last_name)) NOT BETWEEN 1 AND 75 OR length(em)>254 OR em !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN RAISE EXCEPTION 'Person or role incomplete';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
 SELECT id INTO ident FROM public.ay3_persons p WHERE p.site_id=s AND lower(btrim(p.email))=em ORDER BY p.created_at,p.id LIMIT 1;
 IF ident IS NULL THEN
  INSERT INTO public.ay3_persons(site_id,first_name,last_name,full_name,email) VALUES(s,btrim(first_name),btrim(last_name),btrim(first_name)||' '||btrim(last_name),em) RETURNING id INTO ident;
  INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(s,p_actor,'person',ident,jsonb_build_object('source','user_access'));
 END IF;RETURN ident;
END;$function$
;
SET check_function_bodies=on;
CREATE INDEX ay3_occupancy_changes_unit_idx ON public.ay3_occupancy_changes USING btree (unit_id, site_id);
CREATE INDEX ay3_review_receipts_unit_idx ON public.ay3_review_receipts USING btree (unit_id);
CREATE INDEX ay3_review_receipts_actor_idx ON public.ay3_review_receipts USING btree (actor);
CREATE UNIQUE INDEX idx_site_resident_units_unit_person ON public.site_resident_units USING btree (unit_id, person_id) WHERE (person_id IS NOT NULL);
CREATE INDEX idx_site_resident_units_user_active ON public.site_resident_units USING btree (user_id) WHERE (active = true);
CREATE INDEX idx_site_people_site ON public.site_people USING btree (site_id);
CREATE INDEX idx_site_unit_people_unit ON public.site_unit_people USING btree (unit_id);
CREATE INDEX idx_site_unit_people_site ON public.site_unit_people USING btree (site_id);
CREATE UNIQUE INDEX site_unit_people_one_person_per_unit ON public.site_unit_people USING btree (unit_id, person_id);
CREATE INDEX site_audit_by_unit_time ON public.site_audit_events USING btree (site_id, unit_id, happened_at DESC);
CREATE INDEX site_audit_by_person_time ON public.site_audit_events USING btree (site_id, person_id, happened_at DESC);
CREATE INDEX ay2_allocations_entry ON public.ay2_allocations USING btree (entry_id);
CREATE INDEX ay2_allocations_charge ON public.ay2_allocations USING btree (charge_id);
CREATE INDEX ay2_people_unit ON public.ay2_people USING btree (site_id, unit_id);
CREATE INDEX ay2_audit_site ON public.ay2_audit USING btree (site_id, id);
CREATE INDEX ay2_audit_site_page_idx ON public.ay2_audit USING btree (site_id, id DESC);
CREATE INDEX ay2_charges_unit ON public.ay2_charges USING btree (site_id, unit_id);
CREATE INDEX ay3_charges_person ON public.ay2_charges USING btree (person_id);
CREATE INDEX ay2_entries_period ON public.ay2_entries USING btree (site_id, booked_on);
CREATE INDEX ay3_links_unit ON public.ay3_links USING btree (site_id, unit_id, starts_on, ends_on);
CREATE INDEX ay3_links_person ON public.ay3_links USING btree (person_id);
CREATE INDEX ay3_links_person_site ON public.ay3_links USING btree (person_id, site_id);
CREATE INDEX ay3_links_current_idx ON public.ay3_links USING btree (site_id, unit_id, person_id, role) WHERE active;
CREATE INDEX ay3_persons_auth ON public.ay3_persons USING btree (auth_user_id) WHERE (auth_user_id IS NOT NULL);
CREATE INDEX ay3_credits_entry ON public.ay3_credits USING btree (entry_id) WHERE (void_reason IS NULL);
CREATE INDEX ay3_credits_person ON public.ay3_credits USING btree (person_id, site_id);
CREATE INDEX ay3_rules_site ON public.ay3_match_rules USING btree (site_id);
CREATE INDEX ay3_providers_site ON public.ay3_providers USING btree (site_id);
CREATE INDEX ay3_notes_provider ON public.ay3_provider_notes USING btree (provider_id, created_at DESC);
CREATE INDEX ay3_ack_user ON public.ay3_acknowledgements USING btree (user_id, site_id);
CREATE TRIGGER trg_ayapark_claims_updated BEFORE UPDATE ON public.ayapark_claims FOR EACH ROW EXECUTE FUNCTION ayapark_touch_updated_at();
CREATE TRIGGER trg_ayapark_private_updated BEFORE UPDATE ON public.ayapark_private FOR EACH ROW EXECUTE FUNCTION ayapark_touch_updated_at();
CREATE TRIGGER site_people_history AFTER INSERT OR DELETE OR UPDATE ON public.site_people FOR EACH ROW EXECUTE FUNCTION site_person_audit_trigger();
CREATE TRIGGER site_unit_people_history AFTER INSERT OR DELETE OR UPDATE ON public.site_unit_people FOR EACH ROW EXECUTE FUNCTION site_unit_person_audit_trigger();
CREATE TRIGGER site_resident_units_history AFTER INSERT OR DELETE OR UPDATE ON public.site_resident_units FOR EACH ROW EXECUTE FUNCTION site_portal_audit_trigger();
CREATE TRIGGER site_units_history AFTER UPDATE ON public.site_units FOR EACH ROW EXECUTE FUNCTION site_unit_status_audit_trigger();
ALTER TABLE public."ay3_occupancy_changes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay3_user_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay3_review_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ayapark_admins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ayapark_claims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ayapark_private" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."site_sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."site_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."site_units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."site_staff_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."site_resident_units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."site_people" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."site_unit_people" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."site_audit_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."site_audit_view_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay2_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay2_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay2_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay2_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay2_people" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay2_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay2_audit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay2_staged_charges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay2_charges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay2_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay2_announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay3_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay3_persons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay3_credits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay3_match_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay3_providers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay3_provider_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ay3_acknowledgements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_public_ayapark_claims" ON public."ayapark_claims" AS PERMISSIVE FOR SELECT TO "anon","authenticated" USING (true);
CREATE POLICY "admin_update_claims" ON public."ayapark_claims" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (( SELECT ayapark_is_admin() AS ayapark_is_admin)) WITH CHECK (( SELECT ayapark_is_admin() AS ayapark_is_admin));
CREATE POLICY "admin_read_private" ON public."ayapark_private" AS PERMISSIVE FOR SELECT TO "authenticated" USING (( SELECT ayapark_is_admin() AS ayapark_is_admin));
CREATE POLICY "admin_update_private" ON public."ayapark_private" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (( SELECT ayapark_is_admin() AS ayapark_is_admin)) WITH CHECK (( SELECT ayapark_is_admin() AS ayapark_is_admin));
CREATE POLICY "site_sites_select" ON public."site_sites" AS PERMISSIVE FOR SELECT TO "authenticated" USING (site_can_view_site(id));
CREATE POLICY "site_blocks_select" ON public."site_blocks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (site_can_view_site(site_id));
CREATE POLICY "site_units_select" ON public."site_units" AS PERMISSIVE FOR SELECT TO "authenticated" USING (site_can_view_unit(id));
CREATE POLICY "site_units_update" ON public."site_units" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (site_can_manage(site_id)) WITH CHECK (site_can_manage(site_id));
CREATE POLICY "ay2_staged_read" ON public."ay2_staged_charges" AS PERMISSIVE FOR SELECT TO "authenticated" USING (ay2_private.can(site_id, 'finance'::text));
CREATE POLICY "site_staff_select" ON public."site_staff_memberships" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = ( SELECT auth.uid() AS uid)) OR site_can_manage(site_id)));
CREATE POLICY "site_resident_select" ON public."site_resident_units" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM site_units su
  WHERE ((su.id = site_resident_units.unit_id) AND site_can_manage(su.site_id))))));
CREATE POLICY "site_people_staff_select" ON public."site_people" AS PERMISSIVE FOR SELECT TO "authenticated" USING (site_is_staff(site_id));
CREATE POLICY "site_people_managers_insert" ON public."site_people" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (site_can_manage(site_id));
CREATE POLICY "site_people_managers_update" ON public."site_people" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (site_can_manage(site_id)) WITH CHECK (site_can_manage(site_id));
CREATE POLICY "site_unit_people_staff_select" ON public."site_unit_people" AS PERMISSIVE FOR SELECT TO "authenticated" USING (site_is_staff(site_id));
CREATE POLICY "site_unit_people_managers_insert" ON public."site_unit_people" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (site_can_manage(site_id));
CREATE POLICY "site_unit_people_managers_update" ON public."site_unit_people" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (site_can_manage(site_id)) WITH CHECK (site_can_manage(site_id));
CREATE POLICY "site_audit_staff_read" ON public."site_audit_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (site_is_staff(site_id));
CREATE POLICY "site_audit_view_settings_staff_read" ON public."site_audit_view_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (site_is_staff(site_id));
CREATE POLICY "ay2_settings_read" ON public."ay2_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (ay2_private.can(site_id, 'finance'::text));
CREATE POLICY "ay2_permissions_read" ON public."ay2_permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((ay2_private.can(site_id, 'admin'::text) OR (user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "ay2_batches_read" ON public."ay2_batches" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((ay2_private.can(site_id, 'finance'::text) OR ay2_private.can(site_id, 'import'::text)));
CREATE POLICY "ay2_allocations_read" ON public."ay2_allocations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (ay2_private.view_charge(charge_id));
CREATE POLICY "ay2_people_read" ON public."ay2_people" AS PERMISSIVE FOR SELECT TO "authenticated" USING (ay2_private.can(site_id, 'people'::text));
CREATE POLICY "ay2_reports_read" ON public."ay2_reports" AS PERMISSIVE FOR SELECT TO "authenticated" USING (ay2_private.view_site(site_id));
CREATE POLICY "ay2_entries_read" ON public."ay2_entries" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((site_id = ANY (( SELECT COALESCE(array_agg(s.id), '{}'::uuid[]) AS "coalesce"
   FROM site_sites s
  WHERE ay2_private.can(s.id, 'finance'::text))::uuid[])));
CREATE POLICY "ay2_charges_read" ON public."ay2_charges" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((ay2_private.can(site_id, 'finance'::text) OR ay2_private.own_person(person_id)));
CREATE POLICY "ay2_announcements_read" ON public."ay2_announcements" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((ay2_private.view_site(site_id) AND (ay2_private.can(site_id, 'announcements'::text) OR (published AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at > now()))))));
CREATE POLICY "ay3_persons_read" ON public."ay3_persons" AS PERMISSIVE FOR SELECT TO "authenticated" USING (ay2_private.can(site_id, 'people'::text));
CREATE POLICY "ay3_links_read" ON public."ay3_links" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((ay2_private.can(site_id, 'people'::text) OR ay2_private.can(site_id, 'finance'::text) OR ay2_private.own_person(person_id)));
CREATE POLICY "ay3_credits_read" ON public."ay3_credits" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((ay2_private.can(site_id, 'finance'::text) OR ay2_private.own_person(person_id)));
CREATE POLICY "ay3_rules_read" ON public."ay3_match_rules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (ay2_private.can(site_id, 'finance'::text));
CREATE POLICY "ay3_providers_read" ON public."ay3_providers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (ay2_private.can(site_id, 'people'::text));
CREATE POLICY "ay3_provider_notes_read" ON public."ay3_provider_notes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (ay2_private.can(site_id, 'people'::text));
CREATE POLICY "ay3_ack_read" ON public."ay3_acknowledgements" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = ( SELECT auth.uid() AS uid)) OR ay2_private.can(site_id, 'announcements'::text)));
CREATE POLICY "occupancy_read" ON public."ay3_occupancy_changes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM site_units u
  WHERE ((u.id = ay3_occupancy_changes.unit_id) AND (u.site_id = ay3_occupancy_changes.site_id)))));
CREATE POLICY "preferences_own" ON public."ay3_user_preferences" AS PERMISSIVE FOR ALL TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "review_read" ON public."ay3_review_receipts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((site_id = ANY (( SELECT COALESCE(array_agg(s.id), '{}'::uuid[]) AS "coalesce"
   FROM site_sites s
  WHERE ay2_private.can(s.id, 'finance'::text))::uuid[])));
CREATE POLICY "ay2_audit_read" ON public."ay2_audit" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((site_id = ANY (( SELECT COALESCE(array_agg(s.id), '{}'::uuid[]) AS "coalesce"
   FROM site_sites s
  WHERE ay2_private.can(s.id, 'admin'::text))::uuid[])));
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public,ay2_private FROM PUBLIC;
GRANT SELECT ON public."ay3_occupancy_changes" TO "authenticated";
GRANT INSERT ON public."ay3_user_preferences" TO "authenticated";
GRANT SELECT ON public."ay3_user_preferences" TO "authenticated";
GRANT UPDATE ON public."ay3_user_preferences" TO "authenticated";
GRANT SELECT ON public."ay3_review_receipts" TO "authenticated";
GRANT SELECT ON public."ayapark_claims" TO "anon";
GRANT SELECT ON public."ayapark_claims" TO "authenticated";
GRANT SELECT ON public."ayapark_private" TO "authenticated";
GRANT INSERT ON public."site_sites" TO "authenticated";
GRANT SELECT ON public."site_sites" TO "authenticated";
GRANT UPDATE ON public."site_sites" TO "authenticated";
GRANT DELETE ON public."site_sites" TO "authenticated";
GRANT TRUNCATE ON public."site_sites" TO "authenticated";
GRANT REFERENCES ON public."site_sites" TO "authenticated";
GRANT TRIGGER ON public."site_sites" TO "authenticated";
GRANT INSERT ON public."site_blocks" TO "authenticated";
GRANT SELECT ON public."site_blocks" TO "authenticated";
GRANT UPDATE ON public."site_blocks" TO "authenticated";
GRANT DELETE ON public."site_blocks" TO "authenticated";
GRANT TRUNCATE ON public."site_blocks" TO "authenticated";
GRANT REFERENCES ON public."site_blocks" TO "authenticated";
GRANT TRIGGER ON public."site_blocks" TO "authenticated";
GRANT INSERT ON public."site_units" TO "authenticated";
GRANT SELECT ON public."site_units" TO "authenticated";
GRANT UPDATE ON public."site_units" TO "authenticated";
GRANT DELETE ON public."site_units" TO "authenticated";
GRANT TRUNCATE ON public."site_units" TO "authenticated";
GRANT REFERENCES ON public."site_units" TO "authenticated";
GRANT TRIGGER ON public."site_units" TO "authenticated";
GRANT INSERT ON public."site_staff_memberships" TO "authenticated";
GRANT SELECT ON public."site_staff_memberships" TO "authenticated";
GRANT UPDATE ON public."site_staff_memberships" TO "authenticated";
GRANT DELETE ON public."site_staff_memberships" TO "authenticated";
GRANT TRUNCATE ON public."site_staff_memberships" TO "authenticated";
GRANT REFERENCES ON public."site_staff_memberships" TO "authenticated";
GRANT TRIGGER ON public."site_staff_memberships" TO "authenticated";
GRANT SELECT ON public."site_resident_units" TO "authenticated";
GRANT TRUNCATE ON public."site_resident_units" TO "authenticated";
GRANT REFERENCES ON public."site_resident_units" TO "authenticated";
GRANT TRIGGER ON public."site_resident_units" TO "authenticated";
GRANT INSERT ON public."site_people" TO "authenticated";
GRANT SELECT ON public."site_people" TO "authenticated";
GRANT UPDATE ON public."site_people" TO "authenticated";
GRANT DELETE ON public."site_people" TO "authenticated";
GRANT TRUNCATE ON public."site_people" TO "authenticated";
GRANT REFERENCES ON public."site_people" TO "authenticated";
GRANT TRIGGER ON public."site_people" TO "authenticated";
GRANT INSERT ON public."site_unit_people" TO "authenticated";
GRANT SELECT ON public."site_unit_people" TO "authenticated";
GRANT UPDATE ON public."site_unit_people" TO "authenticated";
GRANT DELETE ON public."site_unit_people" TO "authenticated";
GRANT TRUNCATE ON public."site_unit_people" TO "authenticated";
GRANT REFERENCES ON public."site_unit_people" TO "authenticated";
GRANT TRIGGER ON public."site_unit_people" TO "authenticated";
GRANT SELECT ON public."site_audit_events" TO "authenticated";
GRANT SELECT ON public."site_audit_view_settings" TO "authenticated";
GRANT SELECT ON public."ay2_settings" TO "authenticated";
GRANT SELECT ON public."ay2_permissions" TO "authenticated";
GRANT SELECT ON public."ay2_batches" TO "authenticated";
GRANT SELECT ON public."ay2_allocations" TO "authenticated";
GRANT SELECT ON public."ay2_people" TO "authenticated";
GRANT SELECT ON public."ay2_reports" TO "authenticated";
GRANT SELECT ON public."ay2_audit" TO "authenticated";
GRANT SELECT ON public."ay2_staged_charges" TO "authenticated";
GRANT SELECT ON public."ay2_charges" TO "authenticated";
GRANT SELECT ON public."ay2_entries" TO "authenticated";
GRANT SELECT ON public."ay2_announcements" TO "authenticated";
GRANT SELECT ON public."ay3_links" TO "authenticated";
GRANT SELECT ON public."ay3_persons" TO "authenticated";
GRANT SELECT ON public."ay3_credits" TO "authenticated";
GRANT SELECT ON public."ay3_match_rules" TO "authenticated";
GRANT SELECT ON public."ay3_providers" TO "authenticated";
GRANT SELECT ON public."ay3_provider_notes" TO "authenticated";
GRANT SELECT ON public."ay3_acknowledgements" TO "authenticated";
GRANT EXECUTE ON FUNCTION ayapark_is_admin() TO "authenticated";
GRANT EXECUTE ON FUNCTION ayapark_touch_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION ayapark_touch_updated_at() TO "anon";
GRANT EXECUTE ON FUNCTION ayapark_touch_updated_at() TO "authenticated";
GRANT EXECUTE ON FUNCTION site_can_manage(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION site_can_view_unit(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION site_is_staff(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION site_can_view_site(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION site_restore_unit_person(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION site_register_unit_person(uuid,text,text,text,text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION site_link_existing_person(uuid,uuid,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION site_unit_person_audit_trigger() TO PUBLIC;
GRANT EXECUTE ON FUNCTION site_unit_person_audit_trigger() TO "anon";
GRANT EXECUTE ON FUNCTION site_unit_person_audit_trigger() TO "authenticated";
GRANT EXECUTE ON FUNCTION site_portal_audit_trigger() TO PUBLIC;
GRANT EXECUTE ON FUNCTION site_portal_audit_trigger() TO "anon";
GRANT EXECUTE ON FUNCTION site_portal_audit_trigger() TO "authenticated";
GRANT EXECUTE ON FUNCTION site_unit_status_audit_trigger() TO PUBLIC;
GRANT EXECUTE ON FUNCTION site_unit_status_audit_trigger() TO "anon";
GRANT EXECUTE ON FUNCTION site_unit_status_audit_trigger() TO "authenticated";
GRANT EXECUTE ON FUNCTION site_person_audit_trigger() TO PUBLIC;
GRANT EXECUTE ON FUNCTION site_person_audit_trigger() TO "anon";
GRANT EXECUTE ON FUNCTION site_person_audit_trigger() TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.can(uuid,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.own_unit(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.view_site(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.capabilities(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_capabilities(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.view_charge(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_command(uuid,text,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION site_archive_unit_person(uuid,text,date) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay3_review_state(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay3_remove_staff_member(uuid,uuid,boolean,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION site_purge_unit_person(uuid,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.own_person(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.financial_summary(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay3_financial_summary(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.finance_people(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.command(uuid,text,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_workspace(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.record_occupancy(uuid,uuid,date,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay3_audit_page(uuid,integer,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.provider_directory(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay3_provider_directory(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.change_relationship(uuid,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.manage_assignment(uuid,text,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.unlink_relationship(uuid,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.review_sources(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay3_preferences(jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.review_selected(uuid,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay3_review_selected(uuid,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay2_private.staff_directory(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION ay3_staff_directory(uuid) TO "authenticated";
INSERT INTO auth.users(id,email) VALUES ('10000000-0000-0000-0000-000000000001','qa-manager@example.invalid'),('10000000-0000-0000-0000-000000000002','qa-staff@example.invalid'),('10000000-0000-0000-0000-000000000003','qa-resident@example.invalid');
INSERT INTO public.site_sites(id,slug,name) VALUES ('20000000-0000-0000-0000-000000000001','aya-park-2','Synthetic Ayapark');
INSERT INTO public.site_staff_memberships(site_id,user_id,role) VALUES ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','manager');
