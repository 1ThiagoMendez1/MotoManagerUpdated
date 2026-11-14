import { Suspense } from 'react';
import { phoneLoginEnabled } from '@/lib/workshop-phone-auth-server';
import { LoginMethods } from './LoginMethods';
export default function LoginPage() {
  return <Suspense fallback={<p className="p-8 text-center">Preparando tu acceso…</p>}><LoginMethods phoneEnabled={phoneLoginEnabled()}/></Suspense>;
}
