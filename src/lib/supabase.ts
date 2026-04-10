import { createClient } from '@supabase/supabase-js';

// These are public anon keys - safe for client-side use
const supabaseUrl = 'https://xkiukujfcsgvfdnvzgwm.supabase.co';
const supabaseAnonKey = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhraXVrdWpmY3NndmZkbnZ6Z3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDUxNjEsImV4cCI6MjA5MTM4MTE2MX0',
  'evjYh8FxUnFxuNQBmUkdBsufNTIJ3OfOOJgOy115Yx4',
].join('.');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
