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
  average_rating?: number | null;
  review_count?: number;
  recommendation_count?: number;
  recent_public_comment?: string | null;
}

export async function getPublicWorkshops(searchQuery: string = ''): Promise<PublicWorkshop[]> {
  try {
    const supabaseAdmin = createAdminClient();

    let query = supabaseAdmin
      .from('organizations')
      .select(`
        id, 
        name, 
        slug, 
        phone, 
        settings,
        organization_members (
          role,
          profiles ( phone )
        )
      `)
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

    // Aggregated across ALL verified service reviews; no random values or fake counts.
    // RPC is service-role-only, so the underlying private reviews remain inaccessible.
    const { data: reputation, error: reputationError } = await (supabaseAdmin as any)
      .rpc('get_public_workshop_reputation');
    if (reputationError) console.error('[public-workshops] Cannot load verified reputation');
    const reputationById = new Map<string, any>((reputation || []).map(
      (row: any) => [row.organization_id, row]
    ));

    return (data || []).map((org: any) => {
      const ownerMember = org.organization_members?.find((m: any) => m.role === 'owner' || m.role === 'admin');
      const ownerPhone = ownerMember?.profiles?.phone || null;
      const resolvedPhone = org.phone || org.settings?.phone || org.settings?.whatsapp || ownerPhone || null;
      const rating = reputationById.get(org.id);

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        phone: resolvedPhone,
        address: org.settings?.address || null,
        city: org.settings?.city || null,
        maps_link: org.settings?.maps_link || null,
        average_rating: rating ? Number(rating.average_rating) : null,
        review_count: rating ? Number(rating.review_count) : 0,
        recommendation_count: rating ? Number(rating.recommendation_count) : 0,
        recent_public_comment: rating?.recent_public_comment || null,
      };
    });
  } catch (error) {
    console.error('Unexpected error fetching public workshops:', error);
    return [];
  }
}
