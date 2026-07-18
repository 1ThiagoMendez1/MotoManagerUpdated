'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { dismissWelcomeMessage } from "@/actions/welcome-actions";
import { PartyPopper } from "lucide-react";

interface WelcomeModalProps {
    hasSeenWelcome: boolean;
    userName?: string;
    userRole?: string;
    workshopName?: string;
}

export function WelcomeModal({ hasSeenWelcome, userName, userRole, workshopName }: WelcomeModalProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!hasSeenWelcome) {
            setOpen(true);
        }
    }, [hasSeenWelcome]);

    const router = useRouter();

    const handleClose = () => {
        setOpen(false);
        dismissWelcomeMessage().catch(console.error);
        // Redirect to trigger the tour on the main page
        if (window.location.pathname === '/') {
            router.replace('/?tour=true');
        }
    };

    if (!open) return null;

    const getWelcomeMessage = (role?: string) => {
        switch (role) {
            case 'owner':
            case 'admin':
                return "Aquí encontrarás todo lo que necesitas para llevar tu taller al siguiente nivel. ¡Hagamos que tus motores rujan de éxito! 🚀";
            case 'mechanic':
                return "Aquí podrás gestionar tus órdenes de trabajo, registrar tus avances y colaborar con el equipo de forma eficiente. ¡Listos para reparar motores! 🔧";
            case 'receptionist':
                return "Aquí podrás brindar la mejor atención, gestionar clientes, crear nuevas órdenes de servicio y mantener el flujo del taller. ¡A darle la mejor bienvenida a nuestros clientes! 📝";
            default:
                return "Aquí encontrarás las herramientas necesarias para tu trabajo en el taller. ¡Hagamos que tus motores rujan de éxito! 🚀";
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={handleClose}>
            <AlertDialogContent className="bg-gradient-to-br from-indigo-900/90 to-purple-900/90 border-indigo-500/30 text-white backdrop-blur-xl max-w-md">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    {/* Simple CSS animation for "confetti" or sparkles could go here */}
                    <div className="absolute top-10 left-10 text-4xl animate-bounce">✨</div>
                    <div className="absolute bottom-10 right-10 text-4xl animate-bounce delay-700">🎉</div>
                </div>

                <AlertDialogHeader className="relative z-10 text-center space-y-4">
                    <div className="mx-auto bg-white/10 p-4 rounded-full w-fit mb-2">
                        <PartyPopper className="h-10 w-10 text-yellow-300" />
                    </div>
                    <AlertDialogTitle className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-amber-400">
                        ¡Bienvenido a la Familia!
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-lg text-indigo-100 leading-relaxed">
                        <span className="block">
                            Hola <span className="font-bold text-white">{userName || 'Compañero'}</span>, estamos muy felices de tenerte en <span className="font-bold text-white">MotoManager</span>. 🏍️💨
                            {workshopName && (
                                <span className="mt-4 mb-4 p-4 bg-indigo-950/40 rounded-2xl border border-indigo-400/20 shadow-inner block">
                                    <span className="text-sm text-indigo-200 uppercase tracking-wider font-semibold block">Taller actual:</span>
                                    <span className="text-2xl md:text-3xl font-black text-white tracking-wide block mt-1 drop-shadow-md break-words">{workshopName}</span>
                                </span>
                            )}
                            <span className="mt-4 block">{getWelcomeMessage(userRole)}</span>
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="relative z-10 sm:justify-center mt-6">
                    <Button
                        onClick={handleClose}
                        className="bg-white text-indigo-900 hover:bg-gray-100 font-bold text-lg px-8 py-6 rounded-full shadow-lg hover:scale-105 transition-transform"
                    >
                        ¡Vamos a Rodar! 🚀
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
