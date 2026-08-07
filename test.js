const { createClient } = require('@supabase/supabase-js');
globalThis.window = {};
globalThis.document = {};
try {
  const client = createClient('http://localhost:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  console.log('Success');
} catch (e) {
  console.error(e);
}
