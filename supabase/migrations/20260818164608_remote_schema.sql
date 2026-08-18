


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."guard_devotions_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if is_admin() then return new; end if;
  if new.id            is distinct from old.id
     or new.title         is distinct from old.title
     or new.scripture     is distinct from old.scripture
     or new.scripture_ref is distinct from old.scripture_ref
     or new.body          is distinct from old.body
     or new.author_name   is distinct from old.author_name
     or new.created_at    is distinct from old.created_at then
    raise exception 'Only admins can edit a devotion. Members may only react.';
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."guard_devotions_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_posts_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if is_admin() then return new; end if;
  if new.id        is distinct from old.id
     or new.user_id   is distinct from old.user_id
     or new.group_id  is distinct from old.group_id
     or new.body      is distinct from old.body
     or new.photo_url is distinct from old.photo_url
     or new.created_at is distinct from old.created_at then
    raise exception 'Only admins can edit a post. Members may only react.';
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."guard_posts_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_prayers_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if is_admin() then return new; end if;
  if new.id          is distinct from old.id
     or new.user_id     is distinct from old.user_id
     or new.group_id    is distinct from old.group_id
     or new.body        is distinct from old.body
     or new.anonymous   is distinct from old.anonymous
     or new.author_name is distinct from old.author_name
     or new.pinned      is distinct from old.pinned          -- pinning is admin-only
     or new.created_at  is distinct from old.created_at then
    raise exception 'Only admins can edit or pin a prayer. Members may only react.';
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."guard_prayers_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_private_group_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not is_approved() then
    raise exception 'Your profile must be approved by an admin before you can create or join private groups.';
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."guard_private_group_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_profile_privileges"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null then return new; end if;  -- trusted server (service role)
  if (new.role is distinct from old.role)
     and not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    new.role := old.role;
  end if;
  if (new.status is distinct from old.status)
     and not exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator')) then
    new.status := old.status;
  end if;
  return new;
end; $$;


ALTER FUNCTION "public"."guard_profile_privileges"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_devotion_reactions"("devotion_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update devotions set reactions = coalesce(reactions, 0) + 1 where id = devotion_id; $$;


ALTER FUNCTION "public"."increment_devotion_reactions"("devotion_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_post_reaction"("post_id" "uuid", "emoji" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update posts set reactions = jsonb_set(coalesce(reactions,'{}'::jsonb), array[emoji],
    to_jsonb(coalesce((reactions ->> emoji)::int, 0) + 1)) where id = post_id; $$;


ALTER FUNCTION "public"."increment_post_reaction"("post_id" "uuid", "emoji" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_prayer_reactions"("prayer_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update prayers set reactions = coalesce(reactions, 0) + 1 where id = prayer_id; $$;


ALTER FUNCTION "public"."increment_prayer_reactions"("prayer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_approved"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and (status = 'approved' or role = 'admin')
  );
$$;


ALTER FUNCTION "public"."is_approved"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_staff"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator'));
$$;


ALTER FUNCTION "public"."is_staff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_welcome_dm"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare admin_id uuid; room text; welcome_body text;
begin
  if new.status is distinct from 'approved' then return new; end if;
  if tg_op = 'UPDATE' and old.status is not distinct from 'approved' then return new; end if;
  select id into admin_id from public.profiles where role = 'admin' order by created_at asc limit 1;
  if admin_id is null or admin_id = new.id then return new; end if;
  if admin_id::text < new.id::text
    then room := 'dm_' || admin_id::text || '_' || new.id::text;
    else room := 'dm_' || new.id::text || '_' || admin_id::text;
  end if;
  if exists (select 1 from public.messages where room_id = room) then return new; end if;
  welcome_body :=
'Welcome to ESix10 — I''m genuinely glad you''re here. 🦏

You were made for more than comfort. This community is built on Ephesians 6:10 — be strong in the Lord and in the strength of His might. Brotherhood. Sisterhood. Family.

Jump into your group chat, introduce yourself, and check out The Forge when you''re ready. If you ever need anything, just reply right here — my door is always open.

Prepared. Equipped. Unshaken.
— Michael';
  insert into public.messages (room_id, user_id, body, sender_name)
  values (room, admin_id, welcome_body, 'Michael');
  return new;
end; $$;


ALTER FUNCTION "public"."send_welcome_dm"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."staff_emails"() RETURNS TABLE("id" "uuid", "email" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.id, p.email from profiles p where is_staff();
$$;


ALTER FUNCTION "public"."staff_emails"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."devotion_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "devotion_id" "uuid",
    "user_id" "uuid",
    "author_name" "text",
    "body" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."devotion_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."devotions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "scripture" "text",
    "scripture_ref" "text",
    "body" "text" NOT NULL,
    "author_name" "text",
    "reactions" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."devotions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "group_id" "text",
    "event_date" timestamp without time zone,
    "location" "text",
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "approved" boolean DEFAULT false
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forge_challenge_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "challenge_id" "uuid",
    "note" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."forge_challenge_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forge_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'Scripture'::"text",
    "scheduled_date" "date" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."forge_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forge_walks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "distance_miles" numeric(4,2),
    "duration_minutes" integer,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."forge_walks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forge_wod_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "wod_id" "uuid",
    "result" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."forge_wod_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forge_wods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "warmup" "text",
    "main_work" "text",
    "cooldown" "text",
    "coaching_notes" "text",
    "estimated_minutes" integer,
    "difficulty" integer DEFAULT 3,
    "scheduled_date" "date" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."forge_wods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kudos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_user_id" "uuid",
    "to_user_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."kudos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."local_recommendations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" DEFAULT 'Other'::"text",
    "address" "text",
    "city" "text",
    "state" "text",
    "description" "text",
    "website" "text",
    "added_by" "uuid",
    "approved" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."local_recommendations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_audio" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "episode_number" integer,
    "audio_url" "text",
    "thumbnail_url" "text",
    "duration_seconds" integer,
    "premium" boolean DEFAULT false,
    "published" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."media_audio" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_livestreams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "stream_key" "text",
    "playback_id" "text",
    "status" "text" DEFAULT 'offline'::"text",
    "scheduled_at" timestamp without time zone,
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."media_livestreams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'Teaching'::"text",
    "cloudflare_uid" "text",
    "thumbnail_url" "text",
    "duration_seconds" integer,
    "premium" boolean DEFAULT false,
    "published" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."media_videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_watch_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "video_id" "uuid",
    "progress_seconds" integer DEFAULT 0,
    "completed" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."media_watch_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flagged_user_id" "uuid",
    "flagged_by" "uuid",
    "reason" "text",
    "reviewed" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."member_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "text" NOT NULL,
    "user_id" "uuid",
    "body" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "sender_name" "text",
    "photo_url" "text"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_log" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "channel" "text" NOT NULL,
    "last_sent_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_log" OWNER TO "postgres";


ALTER TABLE "public"."notification_log" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."notification_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."post_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid",
    "flagged_by" "uuid",
    "reason" "text",
    "reviewed" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "group_id" "text",
    "body" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "reactions" "jsonb" DEFAULT '{}'::"jsonb",
    "photo_url" "text",
    "photo_approved" boolean DEFAULT true
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prayers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "group_id" "text",
    "body" "text" NOT NULL,
    "anonymous" boolean DEFAULT false,
    "author_name" "text",
    "reactions" integer DEFAULT 0,
    "pinned" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."prayers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."private_group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."private_group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."private_group_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid",
    "user_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."private_group_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."private_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "approved" boolean DEFAULT false,
    "member_count" integer DEFAULT 1,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "join_policy" "text" DEFAULT 'approval'::"text"
);


ALTER TABLE "public"."private_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "group_id" "text",
    "role" "text" DEFAULT 'member'::"text",
    "city" "text",
    "bio" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "state" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "last_seen" timestamp without time zone,
    "username" "text",
    "avatar_url" "text",
    "group_ids" "text"[] DEFAULT '{}'::"text"[],
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "requested_group_id" "text",
    "requested_group_at" timestamp with time zone,
    "marital_status" "text",
    "avatar_pending" "text",
    "terms_accepted_at" timestamp with time zone,
    "terms_version" "text",
    "mod_agreement_at" timestamp with time zone,
    "email_prefs" "jsonb" DEFAULT '{"dm": true, "group": true, "events": true, "prayers": true}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."profile_stats" AS
 WITH "post_c" AS (
         SELECT "posts"."user_id",
            "count"(*) AS "c"
           FROM "public"."posts"
          GROUP BY "posts"."user_id"
        ), "kudos_c" AS (
         SELECT "kudos"."to_user_id" AS "user_id",
            "count"(*) AS "c"
           FROM "public"."kudos"
          GROUP BY "kudos"."to_user_id"
        ), "prayer_c" AS (
         SELECT "prayers"."user_id",
            "count"(*) AS "c"
           FROM "public"."prayers"
          GROUP BY "prayers"."user_id"
        ), "walk_c" AS (
         SELECT "forge_walks"."user_id",
            "count"(*) AS "c",
            COALESCE("sum"("forge_walks"."distance_miles"), (0)::numeric) AS "miles"
           FROM "public"."forge_walks"
          GROUP BY "forge_walks"."user_id"
        ), "chal_c" AS (
         SELECT "forge_challenge_completions"."user_id",
            "count"(*) AS "c"
           FROM "public"."forge_challenge_completions"
          GROUP BY "forge_challenge_completions"."user_id"
        ), "wod_c" AS (
         SELECT "forge_wod_completions"."user_id",
            "count"(*) AS "c"
           FROM "public"."forge_wod_completions"
          GROUP BY "forge_wod_completions"."user_id"
        ), "walk_days" AS (
         SELECT DISTINCT "forge_walks"."user_id",
            "forge_walks"."date" AS "d"
           FROM "public"."forge_walks"
        ), "chal_days" AS (
         SELECT DISTINCT "forge_challenge_completions"."user_id",
            ("forge_challenge_completions"."created_at")::"date" AS "d"
           FROM "public"."forge_challenge_completions"
        ), "wod_days" AS (
         SELECT DISTINCT "forge_wod_completions"."user_id",
            ("forge_wod_completions"."created_at")::"date" AS "d"
           FROM "public"."forge_wod_completions"
        ), "walk_isl" AS (
         SELECT "walk_days"."user_id",
            "walk_days"."d",
            ("walk_days"."d" - ("row_number"() OVER (PARTITION BY "walk_days"."user_id" ORDER BY "walk_days"."d"))::integer) AS "island"
           FROM "walk_days"
        ), "chal_isl" AS (
         SELECT "chal_days"."user_id",
            "chal_days"."d",
            ("chal_days"."d" - ("row_number"() OVER (PARTITION BY "chal_days"."user_id" ORDER BY "chal_days"."d"))::integer) AS "island"
           FROM "chal_days"
        ), "wod_isl" AS (
         SELECT "wod_days"."user_id",
            "wod_days"."d",
            ("wod_days"."d" - ("row_number"() OVER (PARTITION BY "wod_days"."user_id" ORDER BY "wod_days"."d"))::integer) AS "island"
           FROM "wod_days"
        ), "walk_streak" AS (
         SELECT DISTINCT ON ("walk_isl"."user_id") "walk_isl"."user_id",
            "count"(*) OVER (PARTITION BY "walk_isl"."user_id", "walk_isl"."island") AS "cnt"
           FROM "walk_isl"
          ORDER BY "walk_isl"."user_id", "walk_isl"."d" DESC
        ), "chal_streak" AS (
         SELECT DISTINCT ON ("chal_isl"."user_id") "chal_isl"."user_id",
            "count"(*) OVER (PARTITION BY "chal_isl"."user_id", "chal_isl"."island") AS "cnt"
           FROM "chal_isl"
          ORDER BY "chal_isl"."user_id", "chal_isl"."d" DESC
        ), "wod_streak" AS (
         SELECT DISTINCT ON ("wod_isl"."user_id") "wod_isl"."user_id",
            "count"(*) OVER (PARTITION BY "wod_isl"."user_id", "wod_isl"."island") AS "cnt"
           FROM "wod_isl"
          ORDER BY "wod_isl"."user_id", "wod_isl"."d" DESC
        )
 SELECT "p"."id" AS "user_id",
    COALESCE("post_c"."c", (0)::bigint) AS "post_count",
    COALESCE("kudos_c"."c", (0)::bigint) AS "kudos_count",
    COALESCE("prayer_c"."c", (0)::bigint) AS "prayer_count",
    COALESCE("walk_c"."c", (0)::bigint) AS "walk_count",
    COALESCE("chal_c"."c", (0)::bigint) AS "challenge_count",
    COALESCE("wod_c"."c", (0)::bigint) AS "wod_count",
    COALESCE("walk_streak"."cnt", (0)::bigint) AS "walk_streak",
    COALESCE("chal_streak"."cnt", (0)::bigint) AS "challenge_streak",
    COALESCE("wod_streak"."cnt", (0)::bigint) AS "wod_streak",
    COALESCE("walk_c"."miles", (0)::numeric) AS "total_miles",
    (((((COALESCE("post_c"."c", (0)::bigint) * 5) + (COALESCE("walk_c"."c", (0)::bigint) * 10)) + (COALESCE("chal_c"."c", (0)::bigint) * 8)) + (COALESCE("wod_c"."c", (0)::bigint) * 12)) + LEAST((GREATEST(("floor"((EXTRACT(epoch FROM ("now"() - ("p"."created_at")::timestamp with time zone)) / (86400)::numeric)))::integer, 0) * 2), 100)) AS "xp",
    "now"() AS "updated_at"
   FROM ((((((((("public"."profiles" "p"
     LEFT JOIN "post_c" ON (("post_c"."user_id" = "p"."id")))
     LEFT JOIN "kudos_c" ON (("kudos_c"."user_id" = "p"."id")))
     LEFT JOIN "prayer_c" ON (("prayer_c"."user_id" = "p"."id")))
     LEFT JOIN "walk_c" ON (("walk_c"."user_id" = "p"."id")))
     LEFT JOIN "chal_c" ON (("chal_c"."user_id" = "p"."id")))
     LEFT JOIN "wod_c" ON (("wod_c"."user_id" = "p"."id")))
     LEFT JOIN "walk_streak" ON (("walk_streak"."user_id" = "p"."id")))
     LEFT JOIN "chal_streak" ON (("chal_streak"."user_id" = "p"."id")))
     LEFT JOIN "wod_streak" ON (("wod_streak"."user_id" = "p"."id")));


ALTER VIEW "public"."profile_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


ALTER TABLE "public"."push_subscriptions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."push_subscriptions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."room_members" (
    "room_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "added_by" "uuid",
    "is_creator" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."room_members" OWNER TO "postgres";


ALTER TABLE ONLY "public"."devotion_comments"
    ADD CONSTRAINT "devotion_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devotions"
    ADD CONSTRAINT "devotions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forge_challenge_completions"
    ADD CONSTRAINT "forge_challenge_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forge_challenge_completions"
    ADD CONSTRAINT "forge_challenge_completions_user_id_challenge_id_key" UNIQUE ("user_id", "challenge_id");



ALTER TABLE ONLY "public"."forge_challenges"
    ADD CONSTRAINT "forge_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forge_walks"
    ADD CONSTRAINT "forge_walks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forge_wod_completions"
    ADD CONSTRAINT "forge_wod_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forge_wod_completions"
    ADD CONSTRAINT "forge_wod_completions_user_id_wod_id_key" UNIQUE ("user_id", "wod_id");



ALTER TABLE ONLY "public"."forge_wods"
    ADD CONSTRAINT "forge_wods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kudos"
    ADD CONSTRAINT "kudos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."local_recommendations"
    ADD CONSTRAINT "local_recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_audio"
    ADD CONSTRAINT "media_audio_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_livestreams"
    ADD CONSTRAINT "media_livestreams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_videos"
    ADD CONSTRAINT "media_videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_watch_history"
    ADD CONSTRAINT "media_watch_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_watch_history"
    ADD CONSTRAINT "media_watch_history_user_id_video_id_key" UNIQUE ("user_id", "video_id");



ALTER TABLE ONLY "public"."member_flags"
    ADD CONSTRAINT "member_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_flags"
    ADD CONSTRAINT "post_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prayers"
    ADD CONSTRAINT "prayers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."private_group_members"
    ADD CONSTRAINT "private_group_members_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."private_group_members"
    ADD CONSTRAINT "private_group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."private_group_requests"
    ADD CONSTRAINT "private_group_requests_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."private_group_requests"
    ADD CONSTRAINT "private_group_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."private_groups"
    ADD CONSTRAINT "private_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_pkey" PRIMARY KEY ("room_id", "user_id");



CREATE UNIQUE INDEX "notification_log_user_channel" ON "public"."notification_log" USING "btree" ("user_id", "channel");



CREATE UNIQUE INDEX "profiles_username_lower_key" ON "public"."profiles" USING "btree" ("lower"("username")) WHERE ("username" IS NOT NULL);



CREATE INDEX "push_subscriptions_user" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "guard_profile_privileges_trg" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_privileges"();



CREATE OR REPLACE TRIGGER "trg_guard_devotions_update" BEFORE UPDATE ON "public"."devotions" FOR EACH ROW EXECUTE FUNCTION "public"."guard_devotions_update"();



CREATE OR REPLACE TRIGGER "trg_guard_posts_update" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."guard_posts_update"();



CREATE OR REPLACE TRIGGER "trg_guard_prayers_update" BEFORE UPDATE ON "public"."prayers" FOR EACH ROW EXECUTE FUNCTION "public"."guard_prayers_update"();



CREATE OR REPLACE TRIGGER "trg_guard_private_group_requests" BEFORE INSERT ON "public"."private_group_requests" FOR EACH ROW EXECUTE FUNCTION "public"."guard_private_group_insert"();



CREATE OR REPLACE TRIGGER "trg_guard_private_groups" BEFORE INSERT ON "public"."private_groups" FOR EACH ROW EXECUTE FUNCTION "public"."guard_private_group_insert"();



CREATE OR REPLACE TRIGGER "trg_guard_profile_privileges" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_privileges"();



CREATE OR REPLACE TRIGGER "trg_welcome_dm" AFTER INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."send_welcome_dm"();



ALTER TABLE ONLY "public"."devotion_comments"
    ADD CONSTRAINT "devotion_comments_devotion_id_fkey" FOREIGN KEY ("devotion_id") REFERENCES "public"."devotions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devotion_comments"
    ADD CONSTRAINT "devotion_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."forge_challenge_completions"
    ADD CONSTRAINT "forge_challenge_completions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."forge_challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forge_challenge_completions"
    ADD CONSTRAINT "forge_challenge_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forge_challenges"
    ADD CONSTRAINT "forge_challenges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."forge_walks"
    ADD CONSTRAINT "forge_walks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forge_wod_completions"
    ADD CONSTRAINT "forge_wod_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forge_wod_completions"
    ADD CONSTRAINT "forge_wod_completions_wod_id_fkey" FOREIGN KEY ("wod_id") REFERENCES "public"."forge_wods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forge_wods"
    ADD CONSTRAINT "forge_wods_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."kudos"
    ADD CONSTRAINT "kudos_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kudos"
    ADD CONSTRAINT "kudos_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."local_recommendations"
    ADD CONSTRAINT "local_recommendations_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."media_audio"
    ADD CONSTRAINT "media_audio_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."media_livestreams"
    ADD CONSTRAINT "media_livestreams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."media_videos"
    ADD CONSTRAINT "media_videos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."media_watch_history"
    ADD CONSTRAINT "media_watch_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_watch_history"
    ADD CONSTRAINT "media_watch_history_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."media_videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_flags"
    ADD CONSTRAINT "member_flags_flagged_by_fkey" FOREIGN KEY ("flagged_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_flags"
    ADD CONSTRAINT "member_flags_flagged_user_id_fkey" FOREIGN KEY ("flagged_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_flags"
    ADD CONSTRAINT "post_flags_flagged_by_fkey" FOREIGN KEY ("flagged_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_flags"
    ADD CONSTRAINT "post_flags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prayers"
    ADD CONSTRAINT "prayers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."private_group_members"
    ADD CONSTRAINT "private_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."private_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."private_group_members"
    ADD CONSTRAINT "private_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."private_group_requests"
    ADD CONSTRAINT "private_group_requests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."private_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."private_group_requests"
    ADD CONSTRAINT "private_group_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."private_groups"
    ADD CONSTRAINT "private_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "admin manage audio" ON "public"."media_audio" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin manage recs" ON "public"."local_recommendations" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin manage streams" ON "public"."media_livestreams" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin manage videos" ON "public"."media_videos" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin update flags" ON "public"."post_flags" FOR UPDATE USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "count kudos" ON "public"."kudos" FOR SELECT USING (true);



CREATE POLICY "delete completions" ON "public"."forge_challenge_completions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "delete devotion comments" ON "public"."devotion_comments" FOR DELETE USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "delete devotions" ON "public"."devotions" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "delete events" ON "public"."events" FOR DELETE USING ((("auth"."uid"() = "created_by") OR "public"."is_staff"()));



CREATE POLICY "delete groups" ON "public"."private_groups" FOR DELETE USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "delete member" ON "public"."profiles" FOR DELETE USING ((("auth"."uid"() = "id") OR (( SELECT "profiles_1"."role"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"())) = 'admin'::"text")));



CREATE POLICY "delete members" ON "public"."private_group_members" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")));



CREATE POLICY "delete own messages" ON "public"."messages" FOR DELETE USING ((("auth"."uid"() = "user_id") OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")));



CREATE POLICY "delete posts" ON "public"."posts" FOR DELETE USING ((("auth"."uid"() = "user_id") OR "public"."is_staff"()));



CREATE POLICY "delete prayers" ON "public"."prayers" FOR DELETE USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "delete recs" ON "public"."local_recommendations" FOR DELETE USING ((("auth"."uid"() = "added_by") OR "public"."is_staff"()));



CREATE POLICY "delete walks" ON "public"."forge_walks" FOR DELETE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."devotion_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."devotions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forge_challenge_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forge_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forge_walks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forge_wod_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forge_wods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert completions" ON "public"."forge_challenge_completions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "insert devotion comments" ON "public"."devotion_comments" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."is_approved"()));



CREATE POLICY "insert devotions" ON "public"."devotions" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "insert events" ON "public"."events" FOR INSERT WITH CHECK ((("auth"."uid"() = "created_by") AND "public"."is_approved"()));



CREATE POLICY "insert flags" ON "public"."post_flags" FOR INSERT WITH CHECK (("auth"."uid"() = "flagged_by"));



CREATE POLICY "insert groups" ON "public"."private_groups" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "insert kudos" ON "public"."kudos" FOR INSERT WITH CHECK ((("auth"."uid"() = "from_user_id") AND "public"."is_approved"()));



CREATE POLICY "insert member flags" ON "public"."member_flags" FOR INSERT WITH CHECK ((("auth"."uid"() = "flagged_by") AND "public"."is_approved"()));



CREATE POLICY "insert members" ON "public"."private_group_members" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."private_groups" "g"
  WHERE (("g"."id" = "private_group_members"."group_id") AND ("g"."created_by" = "auth"."uid"())))) OR (("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."private_groups" "g"
  WHERE (("g"."id" = "private_group_members"."group_id") AND ("g"."approved" = true) AND ("g"."join_policy" = 'open'::"text")))))));



CREATE POLICY "insert messages" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."is_approved"()));



CREATE POLICY "insert own prayers" ON "public"."prayers" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."is_approved"()));



CREATE POLICY "insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "insert posts" ON "public"."posts" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."is_approved"()));



CREATE POLICY "insert recs" ON "public"."local_recommendations" FOR INSERT WITH CHECK (("auth"."uid"() = "added_by"));



CREATE POLICY "insert requests" ON "public"."private_group_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "insert walks" ON "public"."forge_walks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "insert wod completions" ON "public"."forge_wod_completions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."kudos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."local_recommendations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "manage challenges" ON "public"."forge_challenges" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "manage devotions" ON "public"."devotions" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "manage groups" ON "public"."private_groups" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")));



CREATE POLICY "manage wods" ON "public"."forge_wods" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



ALTER TABLE "public"."media_audio" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_livestreams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_videos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_watch_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."member_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own push subscriptions" ON "public"."push_subscriptions" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own watch history" ON "public"."media_watch_history" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."post_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prayers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."private_group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."private_group_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."private_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "room_members_del" ON "public"."room_members" FOR DELETE TO "authenticated" USING ((("added_by" = "auth"."uid"()) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "room_members_ins" ON "public"."room_members" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (("added_by" = "auth"."uid"()) AND ("user_id" = "auth"."uid"()) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."room_members" "rm"
  WHERE ("rm"."room_id" = "room_members"."room_id"))))) OR (("added_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."room_members" "rm"
  WHERE (("rm"."room_id" = "room_members"."room_id") AND ("rm"."user_id" = "auth"."uid"())))))));



CREATE POLICY "room_members_sel" ON "public"."room_members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "staff update profiles" ON "public"."profiles" FOR UPDATE USING (("public"."is_staff"() OR ("auth"."uid"() = "id")));



CREATE POLICY "update devotions" ON "public"."devotions" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "update events" ON "public"."events" FOR UPDATE USING ("public"."is_staff"());



CREATE POLICY "update flags" ON "public"."post_flags" FOR UPDATE USING ("public"."is_staff"());



CREATE POLICY "update member flags" ON "public"."member_flags" FOR UPDATE USING ("public"."is_staff"());



CREATE POLICY "update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "update posts" ON "public"."posts" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_staff"()));



CREATE POLICY "update prayers" ON "public"."prayers" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "update recs" ON "public"."local_recommendations" FOR UPDATE USING ("public"."is_staff"());



CREATE POLICY "update requests" ON "public"."private_group_requests" FOR UPDATE USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "view approved groups" ON "public"."private_groups" FOR SELECT USING ((("approved" = true) OR ("created_by" = "auth"."uid"()) OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")));



CREATE POLICY "view approved recs" ON "public"."local_recommendations" FOR SELECT USING ((("approved" = true) OR ("added_by" = "auth"."uid"()) OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")));



CREATE POLICY "view challenges" ON "public"."forge_challenges" FOR SELECT USING (true);



CREATE POLICY "view completions" ON "public"."forge_challenge_completions" FOR SELECT USING (true);



CREATE POLICY "view devotion comments" ON "public"."devotion_comments" FOR SELECT USING (true);



CREATE POLICY "view devotions" ON "public"."devotions" FOR SELECT USING (true);



CREATE POLICY "view events" ON "public"."events" FOR SELECT USING ((("approved" = true) OR "public"."is_admin"() OR ("auth"."uid"() = "created_by")));



CREATE POLICY "view flags" ON "public"."post_flags" FOR SELECT USING (("public"."is_admin"() OR ("auth"."uid"() = "flagged_by")));



CREATE POLICY "view kudos" ON "public"."kudos" FOR SELECT USING (true);



CREATE POLICY "view member flags" ON "public"."member_flags" FOR SELECT USING (("public"."is_admin"() OR ("auth"."uid"() = "flagged_by")));



CREATE POLICY "view members" ON "public"."private_group_members" FOR SELECT USING (true);



CREATE POLICY "view messages" ON "public"."messages" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (("left"("room_id", 3) = 'dm_'::"text") AND ("strpos"("room_id", ("auth"."uid"())::"text") > 0)) OR (EXISTS ( SELECT 1
   FROM "public"."room_members" "rm"
  WHERE (("rm"."room_id" = "messages"."room_id") AND ("rm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     CROSS JOIN LATERAL "unnest"("p"."group_ids") "g"("g"))
  WHERE (("p"."id" = "auth"."uid"()) AND ("messages"."room_id" = ('group_'::"text" || "g"."g"))))) OR (EXISTS ( SELECT 1
   FROM "public"."private_group_members" "pgm"
  WHERE (("messages"."room_id" = ('private_'::"text" || ("pgm"."group_id")::"text")) AND ("pgm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "view posts" ON "public"."posts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "view prayers" ON "public"."prayers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "view profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "view published audio" ON "public"."media_audio" FOR SELECT USING (("published" = true));



CREATE POLICY "view published videos" ON "public"."media_videos" FOR SELECT USING (("published" = true));



CREATE POLICY "view requests" ON "public"."private_group_requests" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")));



CREATE POLICY "view streams" ON "public"."media_livestreams" FOR SELECT USING (true);



CREATE POLICY "view walks" ON "public"."forge_walks" FOR SELECT USING (true);



CREATE POLICY "view wod completions" ON "public"."forge_wod_completions" FOR SELECT USING (true);



CREATE POLICY "view wods" ON "public"."forge_wods" FOR SELECT USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."posts";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."guard_devotions_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_devotions_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_devotions_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_posts_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_posts_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_posts_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_prayers_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_prayers_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_prayers_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_private_group_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_private_group_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_private_group_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_profile_privileges"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_profile_privileges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_profile_privileges"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_devotion_reactions"("devotion_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_devotion_reactions"("devotion_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_devotion_reactions"("devotion_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_post_reaction"("post_id" "uuid", "emoji" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_post_reaction"("post_id" "uuid", "emoji" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_post_reaction"("post_id" "uuid", "emoji" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_prayer_reactions"("prayer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_prayer_reactions"("prayer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_prayer_reactions"("prayer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_approved"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_approved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_approved"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_staff"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_staff"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_staff"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_welcome_dm"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_welcome_dm"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_welcome_dm"() TO "service_role";



GRANT ALL ON FUNCTION "public"."staff_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."staff_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."staff_emails"() TO "service_role";
























GRANT ALL ON TABLE "public"."devotion_comments" TO "anon";
GRANT ALL ON TABLE "public"."devotion_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."devotion_comments" TO "service_role";



GRANT ALL ON TABLE "public"."devotions" TO "anon";
GRANT ALL ON TABLE "public"."devotions" TO "authenticated";
GRANT ALL ON TABLE "public"."devotions" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."forge_challenge_completions" TO "anon";
GRANT ALL ON TABLE "public"."forge_challenge_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."forge_challenge_completions" TO "service_role";



GRANT ALL ON TABLE "public"."forge_challenges" TO "anon";
GRANT ALL ON TABLE "public"."forge_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."forge_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."forge_walks" TO "anon";
GRANT ALL ON TABLE "public"."forge_walks" TO "authenticated";
GRANT ALL ON TABLE "public"."forge_walks" TO "service_role";



GRANT ALL ON TABLE "public"."forge_wod_completions" TO "anon";
GRANT ALL ON TABLE "public"."forge_wod_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."forge_wod_completions" TO "service_role";



GRANT ALL ON TABLE "public"."forge_wods" TO "anon";
GRANT ALL ON TABLE "public"."forge_wods" TO "authenticated";
GRANT ALL ON TABLE "public"."forge_wods" TO "service_role";



GRANT ALL ON TABLE "public"."kudos" TO "anon";
GRANT ALL ON TABLE "public"."kudos" TO "authenticated";
GRANT ALL ON TABLE "public"."kudos" TO "service_role";



GRANT ALL ON TABLE "public"."local_recommendations" TO "anon";
GRANT ALL ON TABLE "public"."local_recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."local_recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."media_audio" TO "anon";
GRANT ALL ON TABLE "public"."media_audio" TO "authenticated";
GRANT ALL ON TABLE "public"."media_audio" TO "service_role";



GRANT ALL ON TABLE "public"."media_livestreams" TO "anon";
GRANT ALL ON TABLE "public"."media_livestreams" TO "authenticated";
GRANT ALL ON TABLE "public"."media_livestreams" TO "service_role";



GRANT ALL ON TABLE "public"."media_videos" TO "anon";
GRANT ALL ON TABLE "public"."media_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."media_videos" TO "service_role";



GRANT ALL ON TABLE "public"."media_watch_history" TO "anon";
GRANT ALL ON TABLE "public"."media_watch_history" TO "authenticated";
GRANT ALL ON TABLE "public"."media_watch_history" TO "service_role";



GRANT ALL ON TABLE "public"."member_flags" TO "anon";
GRANT ALL ON TABLE "public"."member_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."member_flags" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notification_log" TO "anon";
GRANT ALL ON TABLE "public"."notification_log" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notification_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notification_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notification_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."post_flags" TO "anon";
GRANT ALL ON TABLE "public"."post_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."post_flags" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."prayers" TO "anon";
GRANT ALL ON TABLE "public"."prayers" TO "authenticated";
GRANT ALL ON TABLE "public"."prayers" TO "service_role";



GRANT ALL ON TABLE "public"."private_group_members" TO "anon";
GRANT ALL ON TABLE "public"."private_group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."private_group_members" TO "service_role";



GRANT ALL ON TABLE "public"."private_group_requests" TO "anon";
GRANT ALL ON TABLE "public"."private_group_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."private_group_requests" TO "service_role";



GRANT ALL ON TABLE "public"."private_groups" TO "anon";
GRANT ALL ON TABLE "public"."private_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."private_groups" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("full_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("group_id") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("role") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("city") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("bio") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("state") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("status") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("last_seen") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("username") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("avatar_url") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("group_ids") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("updated_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("requested_group_id") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("requested_group_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("marital_status") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("avatar_pending") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("terms_accepted_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("terms_version") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("mod_agreement_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("email_prefs") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."profile_stats" TO "anon";
GRANT ALL ON TABLE "public"."profile_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_stats" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."push_subscriptions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."push_subscriptions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."push_subscriptions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."room_members" TO "anon";
GRANT ALL ON TABLE "public"."room_members" TO "authenticated";
GRANT ALL ON TABLE "public"."room_members" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































  create policy "Avatar images are publicly accessible"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Users can update their own avatar"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload their own avatar"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



