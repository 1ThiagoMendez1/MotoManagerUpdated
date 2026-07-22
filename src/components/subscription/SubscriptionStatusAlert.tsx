'use client';


import { useRouter, usePathname } from "next/navigation";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SubscriptionStatusAlertProps {
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
    startDate?: string | null;
    endDate?: string | null;
}

export function SubscriptionStatusAlert({ status, startDate, endDate }: SubscriptionStatusAlertProps) {
    const pathname = usePathname();
    const router = useRouter();

    // Allow access to admin panel (for super admins) and login
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/login')) return null;

    const isExpiredDemo = status === 'trialing' && endDate && new Date(endDate) < new Date();

    if ((status === 'active' || status === 'trialing') && !isExpiredDemo) return null;

    const isPastDue = status === 'past_due' || isExpiredDemo;
    const isCanceled = status === 'canceled';

    const handleLogout = async () => {
        const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;
        await supabase.auth.signOut();
        window.location.href = '/planes';
    };

    return (
        <AlertDialog open={true}>
            <AlertDialogContent className="bg-background/90 border-border/30 backdrop-blur-xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-bold text-center text-foreground">
                        {isPastDue ? "⚠️ Suscripción Suspendida" : "🚫 Acceso Bloqueado"}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-gray-600 dark:text-gray-300 space-y-4 pt-4">
                        {isPastDue ? (
                            <div className="space-y-2">
                                <p>Tu suscripción ha vencido y el acceso al sistema ha sido restringido temporalmente.</p>
                                <div className="bg-card/30 p-4 rounded-lg border border-border/30 text-sm">
                                    <p><span className="font-semibold text-gray-600 dark:text-gray-400">Facturación:</span> {startDate ? format(new Date(startDate), 'dd MMM yyyy', { locale: es }) : '-'}</p>
                                    <p><span className="font-semibold text-red-600 dark:text-red-400">Vencimiento:</span> {endDate ? format(new Date(endDate), 'dd MMM yyyy', { locale: es }) : '-'}</p>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Por favor, realiza el pago para reactivar tu servicio.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p>Tu cuenta ha sido bloqueada permanentemente.</p>
                                <p className="text-gray-600 dark:text-gray-400">El cliente ha decidido retirarse y no utilizar más el servicio.</p>
                                <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-xs text-red-600 dark:text-red-300">
                                    Si crees que esto es un error, contacta al administrador.
                                </div>
                            </div>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-center">
                    <Button variant="destructive" className="w-full sm:w-auto mt-4" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
