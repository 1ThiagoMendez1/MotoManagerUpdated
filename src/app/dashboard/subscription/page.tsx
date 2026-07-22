import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';


import { ManageSubscriptionClient } from './ManageSubscriptionClient'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { DEFAULT_FEATURES, mergePlansWithDefaults } from '@/lib/constants/plans'

export default async function SubscriptionPage() {
    const user = await requireWorkshop()
    const currentUser = await getCurrentUserServer()
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;

    const { data: workshop } = await supabase
        .from('workshops')
        .select('*')
        .eq('id', user.workshopId)
        .single()

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('id', user.userId)
        .single()

    if (!workshop) return <div className="p-8 text-center text-muted-foreground">No se encontró el taller</div>

    let dbPlans: any[] = [];
    let dbFeatures: any[] = [];
    try {
        const { data: p } = await supabase.from('subscription_plans').select('*');
        if (p) dbPlans = p;
        const { data: f } = await supabase.from('subscription_features').select('*');
        if (f) dbFeatures = f;
    } catch (e) {
        console.error("Error fetching plans in subscription page", e);
    }

    const plans = mergePlansWithDefaults(dbPlans);
    const features = dbFeatures.length > 0 ? dbFeatures : DEFAULT_FEATURES;

    return (
        <div className="container mx-auto py-10 px-4 md:px-0">
            <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <ManageSubscriptionClient 
                    currentPlan={workshop.subscription_plan || 'monthly'}
                    userName={profile?.name || currentUser?.email || 'Usuario'}
                    userEmail={currentUser?.email || ''}
                    userId={currentUser?.userId || ''}
                    workshopSlug={workshop.slug}
                    workshopId={workshop.id}
                    plans={plans}
                    features={features}
                />
            </Suspense>
        </div>
    )
}
