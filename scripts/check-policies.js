import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(url, key);
const query = "SELECT polname, permissive, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='profiles' ORDER BY polname";
const res = await supabase.rpc('sql', { query });
console.log(JSON.stringify(res, null, 2));
