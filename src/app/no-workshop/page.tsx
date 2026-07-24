import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function NoWorkshopPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background" />
      
      <Card className="w-full max-w-md bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl relative z-10">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 ring-1 ring-amber-500/20">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Acceso Restringido</CardTitle>
          <CardDescription className="text-base mt-2">
            No tienes un taller asignado
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground leading-relaxed">
            Tu cuenta no está vinculada a ningún taller en este momento. Por favor, contacta al administrador de tu taller para que te asigne los permisos necesarios.
          </p>
          <div className="pt-4 flex flex-col gap-3">
            <Link 
              href="/login" 
              className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
            >
              Volver al Inicio
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
