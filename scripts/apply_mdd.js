const { loadEnvConfig } = require("@next/env");
const { Client } = require("pg");

loadEnvConfig(process.cwd());

const statements = [
  `CREATE EXTENSION IF NOT EXISTS unaccent;`,
  `CREATE EXTENSION IF NOT EXISTS pgcrypto;`,
  `CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    ministry_name TEXT,
    church_name TEXT,
    bio TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );`,
  `CREATE TABLE IF NOT EXISTS public.published_sermons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    local_sermon_id TEXT,

    user_name TEXT NOT NULL,
    preacher_name TEXT NOT NULL,
    church_name TEXT NOT NULL,

    sermon_date DATE NOT NULL,
    sermon_time TEXT,

    sermon_title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,

    main_verse TEXT NOT NULL,
    secondary_verses JSONB NOT NULL DEFAULT '[]'::jsonb,

    introduction TEXT,
    key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
    highlighted_phrases JSONB NOT NULL DEFAULT '[]'::jsonb,

    personal_observations TEXT,
    practical_applications TEXT,
    conclusion TEXT,
    final_summary TEXT,

    visibility TEXT NOT NULL DEFAULT 'public',
    status TEXT NOT NULL DEFAULT 'published',
    source TEXT NOT NULL DEFAULT 'android_app',

    views_count INTEGER NOT NULL DEFAULT 0,

    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_published_sermons_visibility
      CHECK (visibility IN ('public', 'private')),

    CONSTRAINT chk_published_sermons_status
      CHECK (status IN ('draft', 'published', 'unpublished', 'archived')),

    CONSTRAINT chk_published_sermons_source
      CHECK (source IN ('android_app', 'web_admin', 'import'))
  );`,
  `CREATE TABLE IF NOT EXISTS public.sermon_view_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sermon_id UUID NOT NULL REFERENCES public.published_sermons(id) ON DELETE CASCADE,

    viewer_ip_hash TEXT,
    user_agent TEXT,
    referrer TEXT,

    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );`,
  `CREATE TABLE IF NOT EXISTS public.publication_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sermon_id UUID NOT NULL REFERENCES public.published_sermons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    event_type TEXT NOT NULL,

    old_status TEXT,
    new_status TEXT,

    old_visibility TEXT,
    new_visibility TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_publication_events_event_type
      CHECK (
        event_type IN (
          'created',
          'updated',
          'published',
          'unpublished',
          'archived',
          'visibility_changed'
        )
      )
  );`,
  `CREATE INDEX IF NOT EXISTS idx_profiles_email
    ON public.profiles(email);

   CREATE INDEX IF NOT EXISTS idx_published_sermons_user_id
    ON public.published_sermons(user_id);

   CREATE INDEX IF NOT EXISTS idx_published_sermons_slug
    ON public.published_sermons(slug);

   CREATE INDEX IF NOT EXISTS idx_published_sermons_visibility_status
    ON public.published_sermons(visibility, status);

   CREATE INDEX IF NOT EXISTS idx_published_sermons_sermon_date
    ON public.published_sermons(sermon_date DESC);

   CREATE INDEX IF NOT EXISTS idx_published_sermons_created_at
    ON public.published_sermons(created_at DESC);

   CREATE INDEX IF NOT EXISTS idx_published_sermons_preacher_name
    ON public.published_sermons(preacher_name);

   CREATE INDEX IF NOT EXISTS idx_published_sermons_church_name
    ON public.published_sermons(church_name);

   CREATE INDEX IF NOT EXISTS idx_sermon_view_logs_sermon_id
    ON public.sermon_view_logs(sermon_id);

   CREATE INDEX IF NOT EXISTS idx_sermon_view_logs_viewed_at
    ON public.sermon_view_logs(viewed_at DESC);

   CREATE INDEX IF NOT EXISTS idx_publication_events_sermon_id
    ON public.publication_events(sermon_id);

   CREATE INDEX IF NOT EXISTS idx_publication_events_user_id
    ON public.publication_events(user_id);

   CREATE INDEX IF NOT EXISTS idx_publication_events_created_at
    ON public.publication_events(created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_published_sermons_search
    ON public.published_sermons
    USING GIN (
      to_tsvector(
        'portuguese',
        coalesce(sermon_title, '') || ' ' ||
        coalesce(preacher_name, '') || ' ' ||
        coalesce(church_name, '') || ' ' ||
        coalesce(main_verse, '') || ' ' ||
        coalesce(final_summary, '')
      )
    );`,
  `CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`,
  `DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;`,
  `CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();`,
  `DROP TRIGGER IF EXISTS trg_published_sermons_updated_at ON public.published_sermons;`,
  `CREATE TRIGGER trg_published_sermons_updated_at
    BEFORE UPDATE ON public.published_sermons
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();`,
  `CREATE OR REPLACE FUNCTION public.set_published_at()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
        NEW.published_at = now();
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`,
  `DROP TRIGGER IF EXISTS trg_set_published_at ON public.published_sermons;`,
  `CREATE TRIGGER trg_set_published_at
    BEFORE INSERT OR UPDATE ON public.published_sermons
    FOR EACH ROW
    EXECUTE FUNCTION public.set_published_at();`,
  `CREATE OR REPLACE FUNCTION public.increment_sermon_view(
      p_sermon_id UUID,
      p_viewer_ip_hash TEXT DEFAULT NULL,
      p_user_agent TEXT DEFAULT NULL,
      p_referrer TEXT DEFAULT NULL
    )
    RETURNS VOID AS $$
    BEGIN
      INSERT INTO public.sermon_view_logs (
        sermon_id,
        viewer_ip_hash,
        user_agent,
        referrer
      )
      VALUES (
        p_sermon_id,
        p_viewer_ip_hash,
        p_user_agent,
        p_referrer
      );

      UPDATE public.published_sermons
      SET views_count = views_count + 1
      WHERE id = p_sermon_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;`,
  `CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (
        id,
        display_name,
        email
      )
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        NEW.email
      );

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;`,
  `DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;`,
  `CREATE TRIGGER trg_handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();`,
  `CREATE OR REPLACE VIEW public.sermon_dashboard_summary WITH (security_invoker=true) AS
    SELECT
      user_id,
      COUNT(*) AS total_sermons,
      COUNT(*) FILTER (WHERE status = 'published') AS total_published,
      COUNT(*) FILTER (WHERE visibility = 'private') AS total_private,
      COUNT(*) FILTER (WHERE status = 'unpublished') AS total_unpublished,
      COALESCE(SUM(views_count), 0) AS total_views
    FROM public.published_sermons
    GROUP BY user_id;`,
  `CREATE OR REPLACE VIEW public.public_sermons_view WITH (security_invoker=true) AS
    SELECT
      id,
      user_id,
      user_name,
      preacher_name,
      church_name,
      sermon_date,
      sermon_time,
      sermon_title,
      slug,
      main_verse,
      secondary_verses,
      introduction,
      key_points,
      highlighted_phrases,
      practical_applications,
      conclusion,
      final_summary,
      views_count,
      published_at,
      updated_at
    FROM public.published_sermons
    WHERE visibility = 'public'
      AND status = 'published';`,
  `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.published_sermons ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.sermon_view_logs ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.publication_events ENABLE ROW LEVEL SECURITY;`,
  `DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
   DROP POLICY IF EXISTS "Public profiles are readable" ON public.profiles;
   DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;`,
  `CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

   CREATE POLICY "Public profiles are readable"
    ON public.profiles
    FOR SELECT
    USING (is_public = TRUE);

   CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);`,
  `DROP POLICY IF EXISTS "Public published sermons are readable" ON public.published_sermons;
   DROP POLICY IF EXISTS "Users can read own sermons" ON public.published_sermons;
   DROP POLICY IF EXISTS "Users can create own sermons" ON public.published_sermons;
   DROP POLICY IF EXISTS "Users can update own sermons" ON public.published_sermons;
   DROP POLICY IF EXISTS "Users can delete own sermons" ON public.published_sermons;`,
  `CREATE POLICY "Public published sermons are readable"
    ON public.published_sermons
    FOR SELECT
    USING (
      visibility = 'public'
      AND status = 'published'
    );

   CREATE POLICY "Users can read own sermons"
    ON public.published_sermons
    FOR SELECT
    USING (auth.uid() = user_id);

   CREATE POLICY "Users can create own sermons"
    ON public.published_sermons
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can update own sermons"
    ON public.published_sermons
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can delete own sermons"
    ON public.published_sermons
    FOR DELETE
    USING (auth.uid() = user_id);`,
  `DROP POLICY IF EXISTS "Anyone can insert sermon view logs" ON public.sermon_view_logs;
   DROP POLICY IF EXISTS "Users can read view logs from own sermons" ON public.sermon_view_logs;`,
  `CREATE POLICY "Anyone can insert sermon view logs"
    ON public.sermon_view_logs
    FOR INSERT
    WITH CHECK (TRUE);

   CREATE POLICY "Users can read view logs from own sermons"
    ON public.sermon_view_logs
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.published_sermons ps
        WHERE ps.id = sermon_view_logs.sermon_id
          AND ps.user_id = auth.uid()
      )
    );`,
  `DROP POLICY IF EXISTS "Users can read own publication events" ON public.publication_events;
   DROP POLICY IF EXISTS "Users can create own publication events" ON public.publication_events;`,
  `CREATE POLICY "Users can read own publication events"
    ON public.publication_events
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.published_sermons ps
        WHERE ps.id = publication_events.sermon_id
          AND ps.user_id = auth.uid()
      )
    );

   CREATE POLICY "Users can create own publication events"
    ON public.publication_events
    FOR INSERT
    WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1
        FROM public.published_sermons ps
        WHERE ps.id = publication_events.sermon_id
          AND ps.user_id = auth.uid()
      )
    );`,
];

async function main() {
  const connectionString = process.env.CONNECTION_STRING;
  if (!connectionString) throw new Error("CONNECTION_STRING não configurada no .env");

  const client = new Client({ connectionString });
  await client.connect();

  try {
    for (let i = 0; i < statements.length; i += 1) {
      await client.query(statements[i]);
    }
  } finally {
    await client.end();
  }

  process.stdout.write("OK: MDD aplicado.\n");
}

main().catch((err) => {
  process.stderr.write(String(err?.stack ?? err) + "\n");
  process.exit(1);
});
