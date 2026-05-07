import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
const url = 'https://kyisqyajxrsqoesybztu.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzEwMDQyMSwiZXhwIjoyMDkyNjc2NDIxfQ.mC0N_ZvDoe3h30uNnqvgbD4-83UEPiY5vTTkmbgCA_8';
const supabase = createClient(url, key);
const query = "SELECT polname, permissive, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='profiles' ORDER BY polname";
const res = await supabase.rpc('sql', { query });
console.log(JSON.stringify(res, null, 2));
