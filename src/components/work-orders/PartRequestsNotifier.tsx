'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ToastAction } from '@/components/ui/toast';

interface PartRequestsNotifierProps {
    userRole: string;
    organizationId: string;
}

let globalAudioCtx: any = null;

const initAudio = () => {
    try {
        if (!globalAudioCtx) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
                globalAudioCtx = new AudioContext();
            }
        }
        if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
            globalAudioCtx.resume();
        }
    } catch (e) {
        console.error("Failed to init audio", e);
    }
};

const playNotificationSound = () => {
    try {
        if (!globalAudioCtx) {
            initAudio();
        }
        const ctx = globalAudioCtx;
        if (!ctx) return;
        
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        
        const playTone = (freq: number, startTime: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            // Usamos onda 'square' (cuadrada) porque es muy agresiva y penetrante, 
            // perfecta para cortar el ruido de fondo o música en un taller.
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, startTime);
            
            // Subimos la ganancia (volumen) al triple de lo normal (2.5) para que suene MUY duro
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(2.5, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        };
        
        const now = ctx.currentTime;
        // Tonos altos que alertan mejor (como una alarma electrónica)
        playTone(783.99, now, 0.25); // G5
        playTone(987.77, now + 0.20, 0.5); // B5
    } catch (e) {
        console.error("Audio playback failed", e);
    }
};

export function PartRequestsNotifier({ userRole, organizationId }: PartRequestsNotifierProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [supabase] = useState(() => createClient());
    const alarmIntervalRef = useRef<any>(null);

    useEffect(() => {
        // Inicializar el audio en la primera interacción del usuario para desbloquearlo
        const handleInteraction = () => {
            initAudio();
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };
        document.addEventListener('click', handleInteraction);
        document.addEventListener('keydown', handleInteraction);
        return () => {
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };
    }, []);

    useEffect(() => {
        if (userRole !== 'owner' && userRole !== 'admin') {
            return;
        }
        if (!organizationId) return;

        const triggerAlert = (workOrderId?: string, multiple?: boolean) => {
            // Limpiar cualquier alarma anterior
            if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);

            // Sonar inmediatamente al mostrar la alerta
            playNotificationSound();

            // Repetir el sonido cada 2.5 segundos por un máximo de 30 segundos
            let secondsPassed = 0;
            alarmIntervalRef.current = setInterval(() => {
                secondsPassed += 2.5;
                if (secondsPassed >= 30) {
                    if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
                } else {
                    playNotificationSound();
                }
            }, 2500);

            const stopAlarm = () => {
                if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
            };

            toast({
                title: "🔔 ¡Alerta de Repuesto!",
                description: multiple 
                    ? "Tienes repuestos solicitados pendientes por alistar. Por favor revisa las órdenes." 
                    : "Un técnico ha solicitado repuestos para una orden de trabajo.",
                className: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30",
                duration: 30000, // 30 segundos para coincidir con la alarma
                action: workOrderId ? (
                    <ToastAction 
                        altText="Ver orden" 
                        onClick={() => {
                            stopAlarm();
                            router.push(`/work-orders/${workOrderId}`);
                        }}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white border-0"
                    >
                        Ver Orden
                    </ToastAction>
                ) : (
                    <ToastAction 
                        altText="Ir a órdenes" 
                        onClick={() => {
                            stopAlarm();
                            router.push(`/work-orders`);
                        }}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white border-0"
                    >
                        Ver Órdenes
                    </ToastAction>
                )
            });
        };

        const checkPendingRequests = async () => {
            const { count, error } = await supabase
                .from('part_requests')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId)
                .eq('status', 'pending');

            if (!error && count && count > 0) {
                triggerAlert(undefined, true);
            }
        };

        // Realtime subscription
        const channel = supabase
            .channel('part_requests_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'part_requests'
                },
                (payload) => {
                    const newRequest = payload.new;
                    // Filtrar por organización en el cliente para evitar problemas con los filtros de Supabase Realtime
                    if (newRequest.organization_id === organizationId && newRequest.status === 'pending') {
                        triggerAlert(newRequest.work_order_id, false);
                    }
                }
            )
            .subscribe((status, err) => {
                if (status !== 'SUBSCRIBED') {
                    console.error('Supabase Realtime subscription error:', status, err);
                }
            });

        // Check on mount with a small delay to ensure Toaster is mounted
        setTimeout(() => {
            checkPendingRequests();
        }, 1500);

        // 10 minute interval
        const interval = setInterval(() => {
            checkPendingRequests();
        }, 10 * 60 * 1000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [userRole, organizationId, supabase, toast, router]);

    return null;
}
