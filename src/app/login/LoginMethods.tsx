'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LegacyLoginForm } from './LegacyLoginForm';
import { PhoneAccessForm } from '@/components/auth/PhoneAccessForm';
export function LoginMethods({ phoneEnabled }: { phoneEnabled: boolean }) {
  const search = useSearchParams();
  const [email, setEmail] = useState(!phoneEnabled || search.get('method') === 'email' || search.get('recovery') === '1' || search.get('trial') === 'created');
  return <div className="mx-auto w-full max-w-lg px-4 py-8">
    {email ? <LegacyLoginForm/> : <PhoneAccessForm mode="login"/>}
    {phoneEnabled && <button type="button" onClick={() => setEmail(value => !value)} className="mt-5 min-h-11 w-full text-sm font-semibold text-primary underline underline-offset-4">{email ? 'Entrar con código por WhatsApp' : 'Ingresar con correo y contraseña'}</button>}
  </div>;
}
