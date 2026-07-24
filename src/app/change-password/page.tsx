'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setIsLoading(false);
      return;
    }

    try {
      const { changePasswordAction } = await import('@/lib/actions/auth');
      const formData = new FormData();
      formData.append('newPassword', password);

      const result = await changePasswordAction(formData);

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
      }
      // If successful, changePasswordAction calls redirect() which throws NEXT_REDIRECT and handles navigation automatically.
    } catch (err: any) {
      if (err.message && err.message.includes('NEXT_REDIRECT')) {
        // Redirection thrown by Next.js, do nothing
      } else {
        setError(`Ocurrió un error inesperado: ${err.message || 'Desconocido'}`);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 bg-zinc-950">
      <Card className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-zinc-900 border-zinc-800 text-foreground">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <CardTitle className="text-2xl">Cambio de Contraseña</CardTitle>
          <CardDescription className="text-zinc-400">
            Por tu seguridad, debes cambiar la contraseña temporal antes de continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center p-4 bg-green-950/50 border border-green-900 rounded-md">
              <p className="text-green-400 font-medium">¡Contraseña actualizada!</p>
              <p className="text-sm text-green-500/80 mt-1">Redirigiendo al sistema...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              
              {error && (
                <div className="p-3 bg-red-950/50 border border-red-900 rounded-md">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Guardando...' : 'Guardar Contraseña'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
