'use server';




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
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let query = supabaseAdmin
      .from('workshops')
      .select('id, name, slug, phone, address, city, maps_link')
      .neq('subscription_status', 'canceled')
      .order('created_at', { ascending: false });

    // If there is a search query, filter by city or address
    if (searchQuery.trim() !== '') {
      const searchTerm = `%${searchQuery.trim()}%`;
      // We use or() to search multiple columns
      query = query.or(`city.ilike.${searchTerm},address.ilike.${searchTerm},name.ilike.${searchTerm}`);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error('Error fetching public workshops:', error);
      return [];
    }

    return data as PublicWorkshop[];
  } catch (error) {
    console.error('Unexpected error fetching public workshops:', error);
    return [];
  }
}
