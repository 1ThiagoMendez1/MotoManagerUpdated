import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';


import { ManageSubscriptionClient } from './ManageSubscriptionClient'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { DEFAULT_FEATURES, mergePlansWithDefaults } from '@/lib/constants/plans'

export default async function SubscriptionPage() {
    const user = await requireWorkshop()
    const currentUser = await getCurrentUserServer()
    const { supabase } = await getScopedClient();

    const { data: workshop } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.workshopId)
        .single()

    const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.userId)
        .single()
    
    const profileName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : null;

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

    const settings = workshop?.settings || {};
    const rawPlan = settings.plan || workshop?.subscription_plan || 'basic';
    let currentPlan = rawPlan;
    let currentBillingCycle = (settings.billingCycle || settings.billing_cycle || 'monthly') as 'monthly' | 'biannual' | 'yearly';
    if (rawPlan === 'biannual' || rawPlan === 'yearly') {
        currentPlan = 'basic';
        currentBillingCycle = rawPlan;
    }

    const startDate = settings.startDate || settings.demoStartDate || settings.subscription_start_date || workshop?.subscription_start_date || workshop?.created_at || new Date().toISOString();
    let endDate = settings.endDate || settings.demoEndDate || settings.subscription_end_date || workshop?.subscription_end_date || null;
    if (!endDate && startDate) {
        const d = new Date(startDate);
        const monthsToAdd = currentBillingCycle === 'yearly' ? 12 : currentBillingCycle === 'biannual' ? 6 : 1;
        d.setMonth(d.getMonth() + monthsToAdd);
        endDate = d.toISOString();
    }
    const paidAmount = typeof settings.paidAmount === 'number' ? settings.paidAmount : (typeof settings.amount === 'number' ? settings.amount : null);

    return (
        <div className="container mx-auto py-10 px-4 md:px-0">
            <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <ManageSubscriptionClient 
                    currentPlan={currentPlan}
                    currentBillingCycle={currentBillingCycle}
                    startDate={startDate}
                    endDate={endDate}
                    paidAmount={paidAmount}
                    userName={profileName || currentUser?.email || 'Usuario'}
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
