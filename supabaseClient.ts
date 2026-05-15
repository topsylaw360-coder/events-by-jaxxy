import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ezqvxwdhphddagbnwbgf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6cXZ4d2RocGhkZGFnYm53YmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDg1MDYsImV4cCI6MjA5MzYyNDUwNn0.bzbEXgnlRonLPGhE826nMpOSLTa7qJXlCgtEOYpP9-M';

export const supabase = createClient(supabaseUrl, supabaseKey);
