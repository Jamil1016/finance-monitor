import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xkiukujfcsgvfdnvzgwm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhraXVrdWpmY3NndmZkbnZ6Z3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDUxNjEsImV4cCI6MjA5MTM4MTE2MX0.evjYh8FxUnFxuNQBmUkdBsufNTIJ3OfOOJgOy115Yx4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
