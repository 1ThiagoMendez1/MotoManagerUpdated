import Link from 'next/link';
import { AlertTriangle, Home, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-4 py-12">
      <div className="bg-card/30 backdrop-blur-md border border-border/50 rounded-2xl p-8 max-w-md w-full text-center shadow-xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-destructive/10 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6 border border-destructive/20 relative z-10 shadow-inner">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        
        <h1 className="text-5xl font-space font-extrabold mb-2 text-foreground tracking-tight">404</h1>
        <h2 className="text-xl font-medium mb-3 text-foreground/90">Página no encontrada</h2>
        
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          Lo sentimos, la página que intentas visitar no existe o no tienes permisos para acceder a ella.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center relative z-10">
          <Button asChild variant="outline" className="gap-2 border-border/50 hover:bg-muted/50">
            <Link href="/">
              <Home className="w-4 h-4" />
              Inicio
            </Link>
          </Button>
          <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-transparent">
            <Link href="/dashboard">
              <LayoutDashboard className="w-4 h-4" />
              Mi Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
