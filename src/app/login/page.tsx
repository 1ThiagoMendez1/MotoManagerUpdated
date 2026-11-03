'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Wrench, Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kicked = searchParams.get('kicked');
  
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(kicked ? 'Tu sesión ha expirado porque se ha iniciado sesión desde otro dispositivo.' : '');
  
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    // Debug check for Supabase environment variables on client side
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables!', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
      setError('Error de configuración: Faltan variables de entorno de Supabase.');
    }
  }, []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotLoading(true);
    setForgotMessage({ type: '', text: '' });

    if (!forgotEmail || !forgotPhone) {
      setForgotMessage({ type: 'error', text: 'Por favor, ingresa tu correo y teléfono.' });
      setIsForgotLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail, phone: forgotPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        setForgotMessage({ type: 'error', text: data.error || 'Error al procesar la solicitud' });
      } else {
        setForgotMessage({ type: 'success', text: data.message || 'Se ha enviado un mensaje a tu WhatsApp con las nuevas credenciales.' });
        setTimeout(() => {
          setIsForgotOpen(false);
          setForgotMessage({ type: '', text: '' });
          setForgotEmail('');
          setForgotPhone('');
        }, 5000);
      }
    } catch (err: any) {
      setForgotMessage({ type: 'error', text: `Ocurrió un error: ${err.message}` });
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (email === '' || password === '') {
      setError('Por favor, completa todos los campos.');
      setIsLoading(false);
      return;
    }

    try {
      const { loginAction } = await import('@/lib/actions/auth');
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const result = await loginAction(formData);
      
      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
      }
      // If successful, loginAction will call redirect('/') which throws NEXT_REDIRECT and handles navigation automatically.
    } catch (err: any) {
      if (err.message && err.message.includes('NEXT_REDIRECT')) {
        // Redirection thrown by Next.js, do nothing
      } else {
        console.error('Unexpected error during login:', err);
        setError(`Ocurrió un error inesperado al conectar con el servidor: ${err.message || 'Desconocido'}`);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="w-full flex items-center justify-center px-4">
      <Card className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg bg-card border-border text-foreground shadow-md">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 drop-shadow-md">
              <Image 
                src="/logo.png" 
                alt="MotoManager Logo" 
                fill
                sizes="(max-width: 768px) 100vw, 20vw"
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-3xl font-space font-bold text-foreground tracking-tight">MotoManager</h1>
          </div>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription className="text-muted-foreground">Ingresa tus credenciales para acceder al sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background border-border placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background border-border"
              />
            </div>
            {error && <div className="p-3 bg-red-50 border border-red-300 rounded-md"><p className="text-red-600 text-sm text-center">{error}</p></div>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Verificando...' : 'Ingresar'}
            </Button>
            <div className="flex items-center justify-between">
              <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="px-0 font-normal text-muted-foreground hover:text-foreground" type="button">
                    ¿Olvidaste tu contraseña?
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-card border-border text-foreground">
                  <DialogHeader>
                    <DialogTitle>Recuperar Contraseña</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Ingresa tu información de seguridad para recibir credenciales temporales por WhatsApp.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleForgotPassword} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Correo Electrónico</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        className="bg-background border-border"
                        placeholder="tu@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-phone">Teléfono Registrado</Label>
                      <Input
                        id="forgot-phone"
                        type="tel"
                        value={forgotPhone}
                        onChange={(e) => setForgotPhone(e.target.value)}
                        required
                        className="bg-background border-border"
                        placeholder="Ej. 3001234567"
                      />
                    </div>
                    
                    {forgotMessage.text && (
                      <div className={`p-3 border rounded-md text-sm ${forgotMessage.type === 'error' ? 'bg-red-50 border-red-300 text-red-600' : 'bg-green-50 border-green-300 text-green-700'}`}>
                        {forgotMessage.text}
                      </div>
                    )}
                    
                    <Button type="submit" className="w-full" disabled={isForgotLoading}>
                      {isForgotLoading ? (
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      ) : null}
                      {isForgotLoading ? 'Procesando...' : 'Solicitar Credenciales'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </form>



        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full flex items-center justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
