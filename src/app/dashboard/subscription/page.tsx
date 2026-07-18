import { requireWorkshop, getCurrentUserServer } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { ManageSubscriptionClient } from './ManageSubscriptionClient'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

export default async function SubscriptionPage() {
    const user = await requireWorkshop()
    const currentUser = await getCurrentUserServer()
    const supabase = await createClient()

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
                />
            </Suspense>
        </div>
    )
}
