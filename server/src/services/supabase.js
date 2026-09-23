import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../../.env', import.meta.url) });

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Supabase environment variables are required.');

export function supabaseForRequest(request) {
  const authorization = request.get('authorization') || '';
  return createClient(url, key, { global: { headers: authorization ? { Authorization: authorization } : {} } });
}

export const catalogueBucket = 'catalogue-pdfs';
