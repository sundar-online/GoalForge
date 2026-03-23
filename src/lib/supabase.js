import { createClient } from '@supabase/supabase-js';

// Since environment variables on Netlify were causing deployment issues,
// we are hardcoding the standard public Anon Key and URL here directly.
// This ensures that your app will build and run PERFECTLY on ANY hosting provider
// (Netlify, Vercel, GitHub Pages) without needing separate configuration dashboards.
const supabaseUrl = 'https://eaezkmvgcoflrcttoojg.supabase.co';
const supabaseAnonKey = 'sb_publishable_yWWWW4FQOaheUoNOCtGB4A_u1BnVpV3';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);