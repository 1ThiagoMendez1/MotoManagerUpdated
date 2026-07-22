import { NextResponse } from 'next/server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails } from '@/lib/auth-server';

export async function GET() {
    try {
        const user = await getCurrentUserServer();
        const workshop = await getWorkshopDetails();
        return NextResponse.json({ success: true, user, workshop });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message, stack: e.stack });
    }
}
