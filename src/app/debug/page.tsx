import { createClient } from '@/lib/supabase/server';
import { getCurrentUserServer, getWorkshopDetails } from '@/lib/auth-server';

export default async function DebugPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Test helper functions directly
    const serverUser = await getCurrentUserServer();
    const workshopDetails = await getWorkshopDetails();

    // Raw queries to check RLS
    let membership = null;
    let membershipError = null;
    if (user) {
        const memResult = await supabase
            .from('workshop_members')
            .select('workshop_id, role')
            .eq('user_id', user.id);
        membership = memResult.data;
        membershipError = memResult.error;
    }

    return (
        <div className="p-8 font-mono text-sm bg-gray-900 text-foreground min-h-screen">
            <h1 className="text-xl font-bold mb-6 text-green-400">System Diagnostic</h1>

            <div className="grid gap-6">
                <div className="border p-4 rounded border-gray-700">
                    <h2 className="font-bold text-lg mb-2 text-blue-400">1. Supabase Auth (Server)</h2>
                    <div className="bg-black p-2 rounded overflow-auto max-h-40">
                        <pre>{JSON.stringify({ user: user ? { id: user.id, email: user.email } : null, authError }, null, 2)}</pre>
                    </div>
                    {!user && <p className="text-red-400 mt-2">❌ No active session found on server. Try logging in again.</p>}
                </div>

                <div className="border p-4 rounded border-gray-700">
                    <h2 className="font-bold text-lg mb-2 text-blue-400">2. getCurrentUserServer() Output</h2>
                    <div className="bg-black p-2 rounded overflow-auto">
                        <pre>{JSON.stringify(serverUser, null, 2)}</pre>
                    </div>
                    {serverUser?.workshopId ? (
                        <p className="text-green-400 mt-2">✅ Workshop ID found: {serverUser.workshopId}</p>
                    ) : (
                        <p className="text-red-400 mt-2">❌ Workshop ID missing.</p>
                    )}
                </div>

                <div className="border p-4 rounded border-gray-700">
                    <h2 className="font-bold text-lg mb-2 text-blue-400">3. getWorkshopDetails() Output</h2>
                    <div className="bg-black p-2 rounded overflow-auto">
                        <pre>{JSON.stringify(workshopDetails, null, 2)}</pre>
                    </div>
                    {workshopDetails ? (
                        <p className="text-green-400 mt-2">✅ Workshop Data: {workshopDetails.name}</p>
                    ) : (
                        <p className="text-yellow-400 mt-2">⚠️ No workshop details fetched.</p>
                    )}
                </div>

                <div className="border p-4 rounded border-gray-700">
                    <h2 className="font-bold text-lg mb-2 text-blue-400">4. Raw RLS Check (workshop_members)</h2>
                    <div className="bg-black p-2 rounded overflow-auto">
                        <pre>{JSON.stringify({ membership, membershipError }, null, 2)}</pre>
                    </div>
                    {membership && membership.length === 0 && (
                        <p className="text-red-400 mt-2">❌ Table query returned 0 rows. RLS likely blocking access.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
