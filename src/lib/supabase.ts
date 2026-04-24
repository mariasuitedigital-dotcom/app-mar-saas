import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

if (!CONFIG.supabase.url || !CONFIG.supabase.anonKey) {
  console.warn('Supabase configuration is missing in Landing. Check your environment variables.');
}

const supabaseUrl = CONFIG.supabase.url || 'https://placeholder.supabase.co';
const supabaseKey = CONFIG.supabase.anonKey || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);
