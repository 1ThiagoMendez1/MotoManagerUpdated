'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, MessageCircle } from 'lucide-react';

function FirstLoginPasswordChangeModalInner() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get('firstLogin') === 'true') {
      setOpen(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;

      toast({ title: '¡Éxito!', description: 'Contraseña actualizada correctamente' });
      setOpen(false);
      // Remove query param without triggering a full page reload
      router.replace('/');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Error al actualizar la contraseña', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) { /* Prevent closing by clicking outside */ } }}>
      <DialogContent 
        className="sm:max-w-md bg-background border border-border/50 [&>button]:hidden" 
        onInteractOutside={(e) => e.preventDefault()} 
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {step === 1 ? (
          <>
            <DialogHeader className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                <MessageCircle className="h-8 w-8 text-green-500 dark:text-green-400" />
              </div>
              <DialogTitle className="text-2xl text-foreground font-bold tracking-tight pt-2">
                ¡Credenciales enviadas!
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm max-w-[90%] mx-auto leading-relaxed">
                Hemos enviado las credenciales de acceso temporal de tu cuenta y taller a tu <strong>WhatsApp</strong>. Por favor, revísalo y haz clic en <strong>Siguiente</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center pt-4">
              <Button 
                onClick={() => setStep(2)}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold h-11 rounded-xl shadow-lg shadow-green-500/20"
              >
                Siguiente
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl text-foreground">Cambia tu contraseña</DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Por seguridad, debes cambiar la contraseña generada automáticamente antes de continuar en tu nuevo taller.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-sm text-muted-foreground">Nueva contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-card border-border/50 text-foreground rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-sm text-muted-foreground">Confirmar contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar contraseña"
                  className="bg-card border-border/50 text-foreground rounded-xl h-11"
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-primary-foreground font-semibold h-11 rounded-xl shadow-lg shadow-primary/25"
                >
                  {loading ? 'Actualizando...' : 'Actualizar y continuar'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function FirstLoginPasswordChangeModal() {
  return (
    <Suspense fallback={null}>
      <FirstLoginPasswordChangeModalInner />
    </Suspense>
  );
}
