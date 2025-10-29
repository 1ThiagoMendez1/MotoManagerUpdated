'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wrench, Loader2, LogIn, ShieldCheck, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/components/auth/AuthProvider';

interface Tenant {
  id: string;
  name: string;
  domain?: string | null;
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await fetch('/api/tenants');
        if (response.ok) {
          const data = await response.json();
          setTenants(data);
          if (data.length > 0) {
            setTenantId(data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching tenants:', error);
      }
    };

    fetchTenants();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    console.log('🚀 Login attempt:', { email, password, tenantId });

    if (email === '' || password === '' || tenantId === '') {
        setError('Por favor, completa todos los campos.');
        setIsLoading(false);
        return;
    }

    try {
      console.log('🔗 Making direct API call...');

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, tenantId }),
        credentials: 'include',
      });

      console.log('📡 Direct API response status:', response.status);
      console.log('✅ Direct API response ok:', response.ok);

      const responseText = await response.text();
      console.log('📄 Direct API raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('📦 Direct API parsed data:', data);
      } catch (jsonError) {
        console.error('❌ Direct API JSON parse error:', jsonError);
        setError('Respuesta del servidor inválida');
        setIsLoading(false);
        return;
      }

      if (response.ok && data.user && data.token) {
        console.log('🎉 Direct login successful!');
        // Manually set cookie and tenant context
        document.cookie = `auth-token=${data.token}; path=/; max-age=604800`;
        localStorage.setItem('tenantId', tenantId);
        router.push('/');
      } else {
        console.log('❌ Direct login failed:', data.error);
        setError(data.error || 'Credenciales inválidas');
      }
    } catch (error) {
      console.error('💥 Direct login network error:', error);
      setError('Error de conexión');
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4">
      <Card className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg bg-white/10 backdrop-blur-sm border-white/20 text-white">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
                 <Wrench className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-white">MotoManager</h1>
            </div>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription className="text-white/80">Ingresa tus credenciales para acceder al sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant">Organización</Label>
              <Select value={tenantId} onValueChange={setTenantId} required>
                <SelectTrigger className="bg-white/10 border-white/20">
                  <SelectValue placeholder="Selecciona tu organización" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      <div className="flex items-center">
                        <Building2 className="mr-2 h-4 w-4" />
                        {tenant.name}
                        {tenant.domain && (
                          <span className="ml-2 text-xs text-gray-500">({tenant.domain})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border-white/20 placeholder:text-white/60"
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
                className="bg-white/10 border-white/20"
              />
            </div>
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <LogIn className="mr-2"/>
              )}
              {isLoading ? 'Verificando...' : 'Ingresar'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-white/70">
            ¿Quieres contratar?{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Contacta con nosotros
            </Link>
          </p>
          <Separator className="my-6 bg-white/20" />
          <div className="text-center">
             <Button asChild variant="link" className="text-white/70">
                <Link href="/admin">
                     <ShieldCheck className="mr-2 h-4 w-4" />
                     Administrar Plataforma
                </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
