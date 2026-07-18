import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: technicians, error } = await supabaseAdmin
    .from('tecnicos_activos')
    .select('id, workshop_id, name');

  if (error) {
    console.error('Error fetching technicians', error);
    return;
  }

  const seen = new Set();
  const duplicates: string[] = [];

  for (const tech of technicians) {
    const key = `${tech.workshop_id}-${tech.name}`;
    if (seen.has(key)) {
      duplicates.push(tech.id);
    } else {
      seen.add(key);
    }
  }

  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicates. Deleting...`);
    const { error: delError } = await supabaseAdmin
      .from('tecnicos_activos')
      .delete()
      .in('id', duplicates);

    if (delError) {
      console.error('Error deleting duplicates', delError);
    } else {
      console.log('Duplicates deleted successfully.');
    }
  } else {
    console.log('No duplicates found.');
  }
}

main();
