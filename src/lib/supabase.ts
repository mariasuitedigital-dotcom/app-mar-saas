import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

if (!CONFIG.supabase.url || !CONFIG.supabase.anonKey) {
  console.warn('Supabase configuration is missing. Check your environment variables.');
}

export const supabase = createClient(
  CONFIG.supabase.url,
  CONFIG.supabase.anonKey
);
