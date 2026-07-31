'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { KeyRound, MessageCircle, Copy, Check, MoreHorizontal, Loader2, Zap, ShieldAlert, CreditCard } from 'lucide-react';
import { updateWorkshopPlan, updateWorkshopStatus, getWorkshopCredentials, resetUserPasswordAndNotify, sendCredentialsViaWhatsApp } from './actions';
import { useToast } from '@/hooks/use-toast';
import { WompiButton } from '@/components/payments/WompiButton';

// Precios de los planes en pesos colombianos
const PLAN_PRICES: Record<string, { label: string; price: number }> = {
    monthly:  { label: 'Mensual',   price: 18900 },
    biannual: { label: 'Semestral', price: 99900 },
    yearly:   { label: 'Anual',     price: 199900 },
};

function formatCOP(amount: number) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount);
}

function generateReference(workshopId: string, plan: string) {
    const ts = Date.now().toString(36).toUpperCase();
    return `MM-SUB-${workshopId.slice(0, 8).toUpperCase()}-${plan.toUpperCase()}-${ts}`;
}

export default function WorkshopActions({ workshop }: { workshop: any }) {
    const [isLoading, setIsLoading] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [showCredsModal, setShowCredsModal] = useState(false);
    const [isLoadingCreds, setIsLoadingCreds] = useState(false);
    const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
    const [credentials, setCredentials] = useState<{ email?: string, password?: string, phone?: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const plan = workshop.subscription_plan || 'monthly';
    const planInfo = PLAN_PRICES[plan] ?? { label: plan, price: 16900 };
    const amountInCents = planInfo.price * 100;

    // Email del propietario
    const owner = workshop.members?.find((m: any) => m.role === 'owner')?.profile;
    const ownerEmail = owner?.email;

    const reference = generateReference(workshop.id, plan);

    const handleStatusChange = async (status: 'active' | 'past_due' | 'canceled') => {
        try {
            setIsLoading(true);
            await updateWorkshopStatus(workshop.id, status);
            toast({ title: 'Estado actualizado', description: `El taller ahora está ${status}` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado' });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlanChange = async (plan: 'monthly' | 'biannual' | 'yearly') => {
        try {
            setIsLoading(true);
            await updateWorkshopPlan(workshop.id, plan);
            toast({ title: 'Plan actualizado', description: `El plan ahora es ${plan}` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el plan' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewCredentials = async () => {
        const ownerMember = workshop.members?.find((m: any) => m.role === 'owner');
        if (!ownerMember?.user_id) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo identificar al propietario del taller' });
            return;
        }

        try {
            setIsLoadingCreds(true);
            setShowCredsModal(true);
            const data = await getWorkshopCredentials(ownerMember.user_id);
            if (data.error) {
                toast({ variant: 'destructive', title: 'Error', description: data.error });
                setShowCredsModal(false);
            } else {
                setCredentials(data);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            setShowCredsModal(false);
        } finally {
            setIsLoadingCreds(false);
        }
    };

    const handleGenerateNewCode = async () => {
        const ownerMember = workshop.members?.find((m: any) => m.role === 'owner');
        if (!ownerMember?.user_id) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo identificar al propietario del taller' });
            return;
        }

        try {
            setIsLoadingCreds(true);
            const data = await resetUserPasswordAndNotify(
                ownerMember.user_id,
                credentials?.email || ownerEmail || '',
                credentials?.phone || owner?.phone || '',
                owner?.name || 'Propietario'
            );
            if (data.success && data.tempPassword) {
                setCredentials(prev => prev ? { ...prev, password: data.tempPassword } : { email: credentials?.email || ownerEmail || '', password: data.tempPassword, phone: credentials?.phone || owner?.phone || '' });
                toast({ title: 'Éxito', description: 'Se generó un nuevo código y se envió por WhatsApp.' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: data.error || 'No se pudo regenerar el código' });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoadingCreds(false);
        }
    };

    const handleCopyCreds = () => {
        if (!credentials) return;
        const text = `Hola! Aquí tienes tus credenciales de acceso a MotoManager:\nURL: https://${workshop.slug}.motomanager.com.co\nUsuario: ${credentials.email}\nContraseña: ${credentials.password}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: 'Copiado', description: 'Credenciales copiadas al portapapeles' });
    };

    const handleSendWhatsApp = async () => {
        const ownerMember = workshop.members?.find((m: any) => m.role === 'owner');
        if (!ownerMember?.user_id) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo identificar al propietario del taller' });
            return;
        }

        try {
            setIsSendingWhatsApp(true);
            const res = await sendCredentialsViaWhatsApp(ownerMember.user_id);
            if (res.success) {
                toast({ title: 'Enviado', description: 'Código de acceso enviado por WhatsApp al cliente' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: res.error || 'No se pudo enviar el código por WhatsApp' });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSendingWhatsApp(false);
        }
    };


    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(workshop.id)}>
                        Copiar ID Taller
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onSelect={(e) => {
                            setTimeout(() => handleViewCredentials(), 200);
                        }}
                        className="text-blue-400 focus:text-blue-300"
                    >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Ver Credenciales
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onSelect={(e) => {
                            setTimeout(() => handleGenerateNewCode(), 200);
                        }}
                        className="text-amber-400 focus:text-amber-300 focus:bg-amber-500/10"
                    >
                        <Zap className="mr-2 h-4 w-4" />
                        Generar Nuevo Código
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    {/* ✅ COBRAR SUSCRIPCIÓN CON WOMPI */}
                    <DropdownMenuItem
                        onSelect={(e) => {
                            // Dejamos que el menú se cierre naturalmente para que Radix limpie
                            // sus bloqueos de aria-hidden y pointer-events.
                            // Esperamos un poco y abrimos el modal para evitar conflicto.
                            setTimeout(() => setShowPayModal(true), 200);
                        }}
                        className="text-blue-400 focus:text-blue-300 focus:bg-blue-500/10 font-medium"
                    >
                        <Zap className="mr-2 h-4 w-4" />
                        Cobrar Suscripción
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <ShieldAlert className="mr-2 h-4 w-4" />
                            Cambiar Estado
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                                <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                                Activo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange('past_due')}>
                                <span className="h-2 w-2 rounded-full bg-yellow-500 mr-2" />
                                Vencido (Past Due)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange('canceled')}>
                                <span className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                                Bloqueado (Canceled)
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Cambiar Plan
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => handlePlanChange('monthly')}>
                                Mensual ($18.900)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePlanChange('biannual')}>
                                Semestral ($99.900)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePlanChange('yearly')}>
                                Anual ($199.900)
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                </DropdownMenuContent>
            </DropdownMenu>

            {/* Modal de cobro de suscripción */}
            <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
                <DialogContent className="sm:max-w-md bg-[#0d0d0d]/95 backdrop-blur-xl border border-border/30 text-foreground shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                <CreditCard className="h-4 w-4 text-blue-400" />
                            </div>
                            Cobrar Suscripción
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Procesa el pago de la suscripción mediante Wompi.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {/* Info del taller */}
                        <div className="p-4 bg-card/30 rounded-xl border border-border/30 space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-foreground text-base">{workshop.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{workshop.slug}</p>
                                </div>
                                <span className="text-xs px-2 py-1 rounded-full bg-card/50 text-muted-foreground font-medium uppercase">
                                    {planInfo.label}
                                </span>
                            </div>
                            {ownerEmail && (
                                <p className="text-xs text-muted-foreground">📧 {ownerEmail}</p>
                            )}
                        </div>

                        {/* Total */}
                        <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl border border-blue-400/20 flex justify-between items-center">
                            <div>
                                <p className="text-xs text-blue-300/80">Total a cobrar</p>
                                <p className="text-2xl font-bold text-foreground">{formatCOP(planInfo.price)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">Referencia</p>
                                <p className="text-xs font-mono text-muted-foreground">{reference}</p>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                            El cliente recibirá un recibo de pago por email automáticamente.
                        </p>

                        {/* Widget Wompi */}
                        <div className="flex justify-center py-2">
                            <WompiButton
                                amountInCents={amountInCents}
                                reference={reference}
                                customerEmail={ownerEmail}
                                redirectUrl={`${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'https://www.motomanager.com.co'}/admin?payment=success&workshop=${workshop.id}`}
                                buttonLabel="Haz clic para cobrar la suscripción:"
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Credenciales */}
            <Dialog open={showCredsModal} onOpenChange={setShowCredsModal}>
                <DialogContent className="sm:max-w-md bg-[#0d0d0d]/95 backdrop-blur-xl border border-border/30 text-foreground shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                <KeyRound className="h-4 w-4 text-blue-400" />
                            </div>
                            Credenciales Generadas
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Credenciales temporales del taller para ser enviadas al cliente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {isLoadingCreds ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                            </div>
                        ) : credentials ? (
                            <>
                                <div className="p-4 bg-card/30 rounded-xl border border-border/30 space-y-3 font-mono text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground font-sans">URL de acceso:</span>
                                        <span className="text-blue-400 break-all">https://{workshop.slug}.motomanager.com.co</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground font-sans">Usuario (Email):</span>
                                        <span className="text-foreground">{credentials.email}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground font-sans">Contraseña temporal:</span>
                                        <span className="text-foreground font-bold">••••••</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <Button 
                                        variant="outline" 
                                        className="w-full bg-white/5 border-white/10 hover:bg-white/10"
                                        onClick={handleCopyCreds}
                                    >
                                        {copied ? <Check className="mr-2 h-4 w-4 text-green-400" /> : <Copy className="mr-2 h-4 w-4" />}
                                        Copiar
                                    </Button>
                                    
                                    <Button 
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                                        onClick={handleSendWhatsApp}
                                        disabled={isSendingWhatsApp || isLoadingCreds || !credentials.phone}
                                    >
                                        {isSendingWhatsApp ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <MessageCircle className="mr-2 h-4 w-4" />
                                        )}
                                        Enviar
                                    </Button>

                                    <Button 
                                        className="w-full col-span-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold"
                                        onClick={handleGenerateNewCode}
                                        disabled={isLoadingCreds}
                                    >
                                        <Zap className="mr-2 h-4 w-4" />
                                        Generar Nuevo Código de Acceso
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground text-center mt-2">
                                    Asegúrate de pedirle al usuario que cambie la contraseña después de iniciar sesión.
                                </p>
                            </>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
