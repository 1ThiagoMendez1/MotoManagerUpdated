'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Wrench, Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
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
    console.log('Intentando iniciar sesión con:', email);
    setIsLoading(true);
    setError('');

    if (email === '' || password === '') {
      setError('Por favor, completa todos los campos.');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Attempting login via API route...');
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(`La respuesta del servidor no es válida (Status: ${response.status}). Posible error de red o servidor caído.`);
      }

      if (!response.ok) {
        console.error('Login error:', data.error);
        setError(data.error === 'Invalid login credentials' || data.error === 'Invalid login credentials.'
          ? 'Correo o contraseña incorrectos'
          : `Error al iniciar sesión: ${data.error || 'Desconocido'}`);
      } else {
        console.log('Login successful', data);
        // Force full reload to update RootLayout and Header
        if (data.requires_password_change) {
          window.location.href = '/change-password';
        } else if (data.is_super_admin) {
          window.location.href = '/admin';
        } else {
          window.location.href = '/';
        }
      }
    } catch (err: any) {
      console.error('Unexpected error during login:', err);
      setError(`Ocurrió un error inesperado al conectar con el servidor local: ${err.message || 'Desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg bg-card border-border text-foreground shadow-md">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 drop-shadow-md">
              <Image 
                src="/logo.png" 
                alt="MotoManager Logo" 
                fill
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
