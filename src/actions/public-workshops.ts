'use server';

import { createAdminClient } from '@/lib/supabase/admin';

// Define the Workshop interface based on what we need for the public UI
export interface PublicWorkshop {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  maps_link: string | null;
}

export async function getPublicWorkshops(searchQuery: string = ''): Promise<PublicWorkshop[]> {
  try {
    const supabaseAdmin = createAdminClient();

    let query = supabaseAdmin
      .from('organizations')
      .select('id, name, slug, phone, settings')
      .neq('status', 'suspended')
      .order('created_at', { ascending: false });

    // If there is a search query, filter by name
    if (searchQuery.trim() !== '') {
      const searchTerm = `%${searchQuery.trim()}%`;
      query = query.or(`name.ilike.${searchTerm}`);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error('Error fetching public workshops:', error);
      return [];
    }

    return data.map((org: any) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      phone: org.phone,
      address: org.settings?.address || null,
      city: org.settings?.city || null,
      maps_link: org.settings?.maps_link || null,
    }));
  } catch (error) {
    console.error('Unexpected error fetching public workshops:', error);
    return [];
  }
}
