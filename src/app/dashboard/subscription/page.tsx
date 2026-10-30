import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';


import { ManageSubscriptionClient } from './ManageSubscriptionClient'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { DEFAULT_FEATURES, mergePlansWithDefaults } from '@/lib/constants/plans'
import { resolveWorkshopPlan } from '@/lib/workshop-plan'
import { getTrialState } from '@/lib/subscription-trial'
import { catalogSubscriptionPrice, paidSubscriptionCredit } from '@/lib/payments/subscription-payment'

export default async function SubscriptionPage() {
    const user = await requireWorkshop({ allowExpired: true })
    if (!['owner','admin'].includes(user.role)) return <div className="mx-auto max-w-lg p-8 text-center"><h1 className="text-2xl font-bold">Elige el siguiente paso con el dueño de tu taller</h1><p className="mt-4 text-muted-foreground">El dueño o administrador puede contratar un plan para continuar usando MotoManager con la información del taller.</p></div>;
    const currentUser = await getCurrentUserServer()
    const supabase = await createAdminClient();

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
    const trial = getTrialState(settings);
    const currentPlan = resolveWorkshopPlan(settings);
    const legacyCycle = settings.plan === 'biannual' || settings.plan === 'yearly' ? settings.plan : 'monthly';
    const currentBillingCycle = (settings.billingCycle || settings.billing_cycle || legacyCycle) as 'monthly' | 'biannual' | 'yearly';

    const startDate = settings.startDate || settings.demoStartDate || settings.subscription_start_date || workshop?.subscription_start_date || workshop?.created_at || new Date().toISOString();
    let endDate = settings.endDate || settings.demoEndDate || settings.subscription_end_date || workshop?.subscription_end_date || null;
    if (!endDate && startDate) {
        const d = new Date(startDate);
        const monthsToAdd = currentBillingCycle === 'yearly' ? 12 : currentBillingCycle === 'biannual' ? 6 : 1;
        d.setMonth(d.getMonth() + monthsToAdd);
        endDate = d.toISOString();
    }
    const paidAmount = typeof settings.paidAmount === 'number' ? settings.paidAmount : (typeof settings.amount === 'number' ? settings.amount : null);
    const credit = paidSubscriptionCredit(settings, await catalogSubscriptionPrice(currentPlan, currentBillingCycle));

    return (
        <div className="container mx-auto py-10 px-4 md:px-0">
            <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <ManageSubscriptionClient 
                    isTrial={trial.isTrial}
                    serverCredit={credit}
                    paymentReady={Boolean(process.env.WOMPI_PRIVATE_KEY && process.env.WOMPI_INTEGRITY_SECRET && process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY)}
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
