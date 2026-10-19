import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://bvrjyzeijxhfnxpmwgib.supabase.co';

const supabaseAnonKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2cmp5emVpanhoZm54cG13Z2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNzc1OTUsImV4cCI6MjA1NTc1MzU5NX0.placeholder';

let client: SupabaseClient;

try {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
} catch (e) {
  console.warn('Aviso: Inicializando cliente Supabase de contingência:', e);
  client = createClient('https://bvrjyzeijxhfnxpmwgib.supabase.co', 'placeholder', {
    auth: {
      persistSession: false,
    },
  });
}

export const supabase = client;
