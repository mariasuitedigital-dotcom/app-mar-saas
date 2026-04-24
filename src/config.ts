export const CONFIG = {
  whatsapp: import.meta.env.VITE_WHATSAPP_NUMBER || '51999888777',
  instagram: import.meta.env.VITE_INSTAGRAM_URL || '#',
  facebook: import.meta.env.VITE_FACEBOOK_URL || '#',
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  }
};
