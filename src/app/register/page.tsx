'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wrench, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!name || !email || !password || !confirmPassword || !tenantName || !tenantEmail) {
        setError('Por favor, completa todos los campos obligatorios.');
        setIsLoading(false);
        return;
    }

    if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        setIsLoading(false);
        return;
    }

    if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        setIsLoading(false);
        return;
    }

    try {
      // First create the tenant
      const tenantResponse = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tenantName,
          email: tenantEmail,
          phone: tenantPhone || undefined,
        }),
      });

      if (!tenantResponse.ok) {
        const tenantError = await tenantResponse.json();
        setError(tenantError.error || 'Error al crear el tenant.');
        setIsLoading(false);
        return;
      }

      const tenant = await tenantResponse.json();

      // Then register the user
      const userResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          tenantId: tenant.id,
        }),
      });

      if (!userResponse.ok) {
        const userError = await userResponse.json();
        setError(userError.error || 'Error al registrar el usuario.');
        setIsLoading(false);
        return;
      }

      const userData = await userResponse.json();

      toast({
        title: "¡Registro exitoso!",
        description: "Tu cuenta ha sido creada correctamente.",
      });

      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Registration error:', error);
      setError('Error interno del servidor. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20 text-white">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
                <Wrench className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-white">MotoManager</h1>
            </div>
            <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
            <CardDescription className="text-white/80">Regístrate para comenzar a gestionar tu taller de motocicletas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Tu nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-white/10 border-white/20 placeholder:text-white/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico *</Label>
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
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/10 border-white/20 placeholder:text-white/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-white/10 border-white/20 placeholder:text-white/60"
              />
            </div>
            <div className="border-t border-white/20 pt-4 mt-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Información del Taller</h3>
              <div className="space-y-2">
                <Label htmlFor="tenantName">Nombre del Taller *</Label>
                <Input
                  id="tenantName"
                  type="text"
                  placeholder="Nombre de tu taller"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 placeholder:text-white/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantEmail">Email del Taller *</Label>
                <Input
                  id="tenantEmail"
                  type="email"
                  placeholder="contacto@taller.com"
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 placeholder:text-white/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantPhone">Teléfono del Taller</Label>
                <Input
                  id="tenantPhone"
                  type="tel"
                  placeholder="Número de teléfono"
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  className="bg-white/10 border-white/20 placeholder:text-white/60"
                />
              </div>
            </div>
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-white/70">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
