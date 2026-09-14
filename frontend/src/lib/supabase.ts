import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bvrjyzfeijxhfnxpmwgib.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2cmp5emVpanhoZm54cG13Z2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NTUzNDAsImV4cCI6MjEwMjIzMTM0MH0.iv2zBp-u8nwD7qLjXLC2nqIA_9iDIdeX3wdvHU-36wM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
