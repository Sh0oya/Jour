import { createClient } from '@supabase/supabase-js';

// Configuration from user prompt
// Corrected Project ID: lhcyhbudeybjqqjivifq (was missing 'b' in the previous version)
const supabaseUrl = 'https://lhcyhbudeybjqqjivifq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoY3loYnVkZXlianFxaml2aWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczOTk4NzIsImV4cCI6MjA4Mjk3NTg3Mn0.9Jd7UFWwjYBMxvW2iUgH_H-7ZnkQbKjwo62lvG3l3ms';

export const supabase = createClient(supabaseUrl, supabaseKey);