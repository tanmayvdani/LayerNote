import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://silgimyukbflpayzpwic.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fjJV0YgwMkYKcH0e0bmnGg_YQNbBuvw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
