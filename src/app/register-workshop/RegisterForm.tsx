'use client'

import { registerWorkshop } from './actions'
import { useActionState, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFormStatus } from 'react-dom'
import { Wrench, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

const initialState = {
    error: '',
}

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : (
                <Wrench className="mr-2 h-4 w-4" />
            )}
            {pending ? 'Registrando...' : 'Crear Taller'}
        </Button>
    )
}

export default function RegisterForm() {
    const router = useRouter()
    // @ts-ignore - useFormState types might conflict in some setups but this is valid
    const [state, formAction] = useActionState(registerWorkshop, initialState)
    const [plan, setPlan] = useState('monthly')
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(new Date().setDate(new Date().getDate() + 15)),
    })
    const [showSuccessDialog, setShowSuccessDialog] = useState(false)

    useEffect(() => {
        if (state?.error) {
            toast.error('Error al registrar', {
                description: state.error,
                duration: 5000,
            });
        }
        if (state?.success && state?.data) {
            setShowSuccessDialog(true);
            toast.success('Registro exitoso');
        }
    }, [state]);

    return (
        <div className="w-full flex flex-col items-center justify-center p-4 py-12 relative z-10">
            <Card className="w-full max-w-md bg-background/80 backdrop-blur-xl border-primary/20 shadow-2xl text-foreground">
                <CardHeader className="text-center pb-6">
                    <div className="flex justify-center items-center gap-3 mb-6">
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 drop-shadow-lg">
                            <Image 
                                src="/logo.png" 
                                alt="MotoManager Logo" 
                                fill
                                className="object-contain hover:scale-105 transition-transform duration-300"
                                priority
                            />
                        </div>
                        <h1 className="text-3xl font-space font-bold text-foreground tracking-tight">MotoManager</h1>
                    </div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">Registra tu Taller</CardTitle>
                    <CardDescription className="text-muted-foreground mt-2 text-base">
                        Comienza a gestionar tu negocio de forma profesional
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} onSubmit={(e) => {
                        const formData = new FormData(e.currentTarget);
                        console.log('Intentando registrar usuario con correo:', formData.get('email'));
                    }} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="workshopName">Nombre del Taller</Label>
                            <Input
                                id="workshopName"
                                name="workshopName"
                                required
                                placeholder="Moto Taller Express"
                                className="bg-card/50 border-border/50 placeholder:text-muted-foreground"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Identificador (Slug)</Label>
                            <Input
                                id="slug"
                                name="slug"
                                required
                                placeholder="moto-taller-express"
                                className="bg-card/50 border-border/50 placeholder:text-muted-foreground"
                            />
                            <p className="text-xs text-muted-foreground">Usado en tu URL personalizada</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="legalName">Razón Social (Opcional)</Label>
                                <Input
                                    id="legalName"
                                    name="legalName"
                                    placeholder="Motos y Repuestos S.A.S."
                                    className="bg-card/50 border-border/50 placeholder:text-muted-foreground"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="taxIdentifier">RUT / NIT (Opcional)</Label>
                                <Input
                                    id="taxIdentifier"
                                    name="taxIdentifier"
                                    placeholder="900.123.456-7"
                                    className="bg-card/50 border-border/50 placeholder:text-muted-foreground"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subscriptionPlan">Plan de Suscripción</Label>
                            <Select name="subscriptionPlan" value={plan} onValueChange={setPlan} required>
                                <SelectTrigger className="bg-card/50 border-border/50 text-foreground">
                                    <SelectValue placeholder="Selecciona un plan" />
                                </SelectTrigger>
                                <SelectContent className="bg-background/90 border-border/50 text-foreground backdrop-blur-xl">
                                    <SelectItem value="monthly">Mensual ($18.900/mes)</SelectItem>
                                    <SelectItem value="biannual">Semestral ($99.900/6 meses)</SelectItem>
                                    <SelectItem value="yearly">Anual ($199.900/año) - ¡Ahorra!</SelectItem>
                                    <SelectItem value="demo">Demo (Solo Administradores)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {plan === 'demo' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Vigencia de la Demo (Ida y Vuelta)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={`w-full justify-start text-left font-normal bg-card/50 border-border/50 text-foreground hover:bg-card/70 ${!dateRange && "text-muted-foreground"}`}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                                                        {format(dateRange.to, "LLL dd, y", { locale: es })}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, "LLL dd, y", { locale: es })
                                                )
                                            ) : (
                                                <span>Selecciona fecha de inicio y fin</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-background border-border" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                            locale={es}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <input type="hidden" name="demoStartDate" value={dateRange?.from?.toISOString() || ''} />
                                <input type="hidden" name="demoEndDate" value={dateRange?.to?.toISOString() || ''} />
                                <p className="text-xs text-muted-foreground">La cuenta mostrará que está en demo y se bloqueará al finalizar este periodo.</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="fullName">Tu Nombre Completo</Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                required
                                placeholder="Juan Pérez"
                                className="bg-card/50 border-border/50 placeholder:text-muted-foreground"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                required
                                placeholder="+57 300 123 4567"
                                className="bg-card/50 border-border/50 placeholder:text-muted-foreground"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="juan@ejemplo.com"
                                className="bg-card/50 border-border/50 placeholder:text-muted-foreground"
                            />
                        </div>

                        {/* Password field removed - will be auto generated */}

                        {state?.error && (
                            <div className="space-y-2">
                                <div className="p-2 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded text-center">
                                    {(state.error as string)}
                                </div>
                                {/* Show detailed validation errors if available */}
                                {state?.details && (
                                    <div className="text-xs text-red-300 bg-red-950/30 p-2 rounded">
                                        <ul className="list-disc list-inside text-left">
                                            {Object.entries(state.details).map(([field, errors]: [string, any]) => (
                                                <li key={field}>
                                                    <span className="font-semibold capitalize">{field}:</span> {Array.isArray(errors) ? errors.join(', ') : errors}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <SubmitButton />
                    </form>
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                        ¿Ya tienes cuenta?{' '}
                        <Link href="/login" className="font-semibold text-primary hover:underline">
                            Inicia sesión aquí
                        </Link>
                    </p>
                </CardContent>
            </Card>

            <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <AlertDialogContent className="bg-card text-foreground border-border max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">¡Taller Registrado Exitosamente!</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 text-sm mt-4 text-muted-foreground">
                                <p>El taller ha sido creado y tu cuenta configurada correctamente.</p>
                                <div className="bg-background/50 border border-border/50 p-4 rounded-xl space-y-3">
                                    <p><strong className="text-foreground">Taller:</strong> {state?.data?.workshopName}</p>
                                    {state?.data?.legalName && (
                                        <p><strong className="text-foreground">Razón Social:</strong> {state.data.legalName}</p>
                                    )}
                                    {state?.data?.taxIdentifier && (
                                        <p><strong className="text-foreground">RUT/NIT:</strong> {state.data.taxIdentifier}</p>
                                    )}
                                    <p><strong className="text-foreground">URL (Slug):</strong> {state?.data?.slug}</p>
                                    
                                    <div className="h-px bg-border my-2" />
                                    
                                    <p><strong className="text-foreground">Propietario:</strong> {state?.data?.fullName}</p>
                                    <p><strong className="text-foreground">Email:</strong> {state?.data?.email}</p>
                                    <p><strong className="text-foreground">Teléfono:</strong> {state?.data?.phone}</p>
                                    
                                    <div className="h-px bg-border my-2" />
                                    
                                    <p><strong className="text-foreground">Plan:</strong> {state?.data?.subscriptionPlan === 'demo' ? 'Demo (Solo Administradores)' : state?.data?.subscriptionPlan}</p>
                                    
                                    {state?.data?.subscriptionPlan === 'demo' && state?.data?.demoStartDate && state?.data?.demoEndDate && (
                                        <>
                                            <div className="h-px bg-border my-2" />
                                            <p><strong className="text-foreground">Inicio de Demo:</strong> {format(new Date(state.data.demoStartDate), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                                            <p><strong className="text-foreground">Fin de Demo:</strong> {format(new Date(state.data.demoEndDate), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                                            <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20 text-center">
                                                <p className="text-primary font-semibold">
                                                    Días de prueba: {differenceInDays(new Date(state.data.demoEndDate), new Date(state.data.demoStartDate))} días
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogAction onClick={() => router.push('/admin')} className="w-full">
                            Volver al Administrador
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
