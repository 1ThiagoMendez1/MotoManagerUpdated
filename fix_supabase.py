import os
import glob
import re

directory = 'src'
pattern1 = re.compile(r'(createSupabaseClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!\s*)\)')
pattern2 = re.compile(r'(createClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!\s*)\)')

for filepath in glob.glob(directory + '/**/*.ts', recursive=True) + glob.glob(directory + '/**/*.tsx', recursive=True):
    with open(filepath, 'r') as file:
        content = file.read()
    
    new_content = pattern1.sub(r'\1, { auth: { autoRefreshToken: false, persistSession: false } })', content)
    new_content = pattern2.sub(r'\1, { auth: { autoRefreshToken: false, persistSession: false } })', new_content)

    # Some variables might be called differently, e.g. supabaseUrl, supabaseServiceKey
    pattern3 = re.compile(r'(createSupabaseClient\(\s*supabaseUrl,\s*supabaseServiceKey\s*)\)')
    pattern4 = re.compile(r'(createClient\(\s*supabaseUrl,\s*supabaseServiceKey\s*)\)')
    
    new_content = pattern3.sub(r'\1, { auth: { autoRefreshToken: false, persistSession: false } })', new_content)
    new_content = pattern4.sub(r'\1, { auth: { autoRefreshToken: false, persistSession: false } })', new_content)

    if new_content != content:
        with open(filepath, 'w') as file:
            file.write(new_content)
        print(f'Fixed {filepath}')

