'use client';
import { useState } from 'react';
import { CreditCard, ArrowRight, Lock, Shield, CheckCircle2, Loader2, Wrench } from 'lucide-react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WompiButton } from '@/components/payments/WompiButton';
import { registerWorkshopPublic } from '../actions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  id: 'monthly' | 'biannual' | 'yearly';
  name: string;
  price: number;
  amountInCents: number;
  period: string;
  gradient: string;
  border: string;
  savings: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

// ─── Submit button for registration form ──────────────────────────────────────

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 disabled:opacity-60 text-primary-foreground font-semibold h-12 rounded-xl transition-all text-sm shadow-lg shadow-primary/25"
    >
      {pending
        ? <><Loader2 className="h-4 w-4 animate-spin" />Creando tu cuenta...</>
        : <><Wrench className="h-4 w-4" />Activar mi taller</>
      }
    </button>
  );
}

// ─── Pre-payment modal ────────────────────────────────────────────────────────

interface PayModalProps {
  plan: Plan | null;
  onClose: () => void;
  appUrl: string;
}

export function PaymentModal({ plan, onClose, appUrl }: PayModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  if (!plan) return null;

  const reference = `MM-NEW-${plan.id.toUpperCase()}-${typeof window !== 'undefined' ? Date.now().toString(36).toUpperCase() : 'REF'}`;

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    console.log('==== INICIO DE PAGO EN /PLANES ====', { name, email, planId: plan.id, reference });
    localStorage.setItem('mm_prepayment', JSON.stringify({ name, email, plan: plan.id }));
    setStep(2);
  };

  const redirectUrl = `${appUrl}/planes?payment=success&plan=${plan.id}&ref=${reference}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <div className="p-2 bg-primary/20 rounded-xl">
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-foreground">Plan {plan.name}</h2>
            <p className="text-muted-foreground text-xs">
              {step === 1 ? 'Ingresa tus datos para continuar' : 'Confirma tu pago con Wompi'}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none px-2">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Plan summary */}
          <div className={`p-4 rounded-xl bg-gradient-to-br ${plan.gradient} border ${plan.border}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Total a pagar</p>
                <p className="text-2xl font-extrabold text-foreground">{formatCOP(plan.price)}</p>
                <p className="text-muted-foreground text-xs">{plan.period}</p>
              </div>
              {plan.savings && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/15 border border-green-400/25 text-green-400 font-medium">
                  {plan.savings}
                </span>
              )}
            </div>
          </div>

          {/* Step 1: collect data */}
          {step === 1 ? (
            <form onSubmit={handleContinue} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pay-name" className="text-muted-foreground text-sm">Nombre completo</Label>
                <Input
                  id="pay-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Juan Pérez"
                  required
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-email" className="text-muted-foreground text-sm">Correo electrónico</Label>
                <Input
                  id="pay-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="juan@ejemplo.com"
                  required
                  className="rounded-xl h-11"
                />
                <p className="text-xs text-muted-foreground">El recibo de pago llegará a este correo.</p>
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-primary-foreground font-semibold h-12 rounded-xl transition-all text-sm shadow-lg shadow-primary/25"
              >
                Continuar al pago seguro <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            /* Step 2: Wompi */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted border border-border space-y-1">
                <p className="text-sm text-muted-foreground font-medium">{name}</p>
                <p className="text-sm text-muted-foreground">📧 {email}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">Ref: {reference}</p>
              </div>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                Serás redirigido a Wompi para completar el pago.
                Una vez confirmado, regresarás aquí para activar tu cuenta.
              </p>
              <div className="flex justify-center py-1">
                <WompiButton
                  amountInCents={plan.amountInCents}
                  reference={reference}
                  customerEmail={email}
                  customerName={name}
                  redirectUrl={redirectUrl}
                  buttonLabel={`Pagar ${formatCOP(plan.price)} con Wompi`}
                />
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                ← Volver y editar mis datos
              </button>
              <div className="flex items-center justify-center gap-4 text-muted-foreground text-xs">
                <span className="flex items-center gap-1"><Lock className="h-3 w-3" />Pago cifrado SSL</span>
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" />Powered by Wompi</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Registration modal (post-payment) ───────────────────────────────────────

const PLAN_LABELS: Record<string, { name: string; price: number; period: string }> = {
  monthly:  { name: 'Mensual',   price: 18900,  period: '/ mes' },
  biannual: { name: 'Semestral', price: 99900,  period: '/ 6 meses' },
  yearly:   { name: 'Anual',     price: 199900, period: '/ año' },
};

interface RegModalProps {
  open: boolean;
  plan: string;
  name: string;
  email: string;
  reference: string;
  onClose: () => void;
}

export function RegistrationModal({ open, plan, name, email, reference, onClose }: RegModalProps) {
  const [regState, regAction] = useActionState(registerWorkshopPublic, { error: '', details: {} });
  const info = PLAN_LABELS[plan] ?? PLAN_LABELS.monthly;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border sticky top-0 bg-background z-10">
          <div className="p-2 bg-green-500/20 rounded-xl shrink-0 mt-0.5">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-foreground">¡Pago recibido con éxito!</h2>
            <p className="text-muted-foreground text-xs mt-0.5">Ahora crea tu cuenta para acceder a MotoManager</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Plan confirmation */}
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex justify-between items-center">
            <div>
              <p className="text-green-400/70 text-xs mb-0.5">Plan activado</p>
              <p className="font-bold text-foreground">{info.name} · {formatCOP(info.price)}</p>
              <p className="text-muted-foreground text-xs">{info.period}</p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-green-400" />
          </div>
          {reference && (
            <p className="text-xs text-muted-foreground font-mono">Ref: {reference}</p>
          )}

          {/* Registration form */}
          <form action={regAction} className="space-y-4">
            <input type="hidden" name="subscriptionPlan" value={plan} />
            <input type="hidden" name="paymentRef" value={reference} />

            <div className="space-y-1.5">
              <Label htmlFor="reg-name" className="text-muted-foreground text-sm">Tu nombre completo</Label>
              <Input
                id="reg-name"
                name="fullName"
                defaultValue={regState?.fields?.fullName || name}
                required
                placeholder="Juan Pérez"
                className="rounded-xl h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reg-phone" className="text-muted-foreground text-sm">Teléfono / WhatsApp</Label>
                <Input
                  id="reg-phone"
                  name="phone"
                  type="tel"
                  defaultValue={regState?.fields?.phone || ''}
                  required
                  placeholder="+57 300 123 4567"
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-email" className="text-muted-foreground text-sm">Correo electrónico</Label>
                <Input
                  id="reg-email"
                  name="email"
                  type="email"
                  defaultValue={regState?.fields?.email || email}
                  required
                  placeholder="juan@ejemplo.com"
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reg-workshop" className="text-muted-foreground text-sm">Nombre del taller *</Label>
                <Input
                  id="reg-workshop"
                  name="workshopName"
                  defaultValue={regState?.fields?.workshopName || ''}
                  required
                  placeholder="Fucks News"
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-workshopPhone" className="text-muted-foreground text-sm">Teléfono del taller</Label>
                <Input
                  id="reg-workshopPhone"
                  name="workshopPhone"
                  defaultValue={regState?.fields?.workshopPhone || ''}
                  placeholder="Ej: 3001234567"
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reg-address" className="text-muted-foreground text-sm">Dirección exacta</Label>
                <Input
                  id="reg-address"
                  name="address"
                  defaultValue={regState?.fields?.address || ''}
                  required
                  placeholder="Ej: Calle 10 # 5-32, Local 3"
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-mapsLink" className="text-muted-foreground text-sm">Link de Maps o Waze</Label>
                <Input
                  id="reg-mapsLink"
                  name="mapsLink"
                  type="url"
                  defaultValue={regState?.fields?.mapsLink || ''}
                  placeholder="Ej: https://maps.app.goo.gl/..."
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reg-city" className="text-muted-foreground text-sm">Ciudad</Label>
                <Input
                  id="reg-city"
                  name="city"
                  defaultValue={regState?.fields?.city || ''}
                  required
                  placeholder="Ej: Bogotá"
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-nit" className="text-muted-foreground text-sm"># NIT</Label>
                <Input
                  id="reg-nit"
                  name="nit"
                  defaultValue={regState?.fields?.nit || ''}
                  required
                  placeholder="Ej: 900.123.456-7"
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-slug" className="text-muted-foreground text-sm">Identificador único del taller</Label>
              <Input
                id="reg-slug"
                name="slug"
                defaultValue={regState?.fields?.slug || ''}
                required
                placeholder="fucks-news"
                className="rounded-xl h-11"
              />
              <p className="text-xs text-muted-foreground">
                Solo minúsculas, números y guiones. Ej: <span className="font-mono">fucks-news</span>
              </p>
            </div>

            {/* Password field removed - it will be generated automatically */}

            {regState?.error && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-sm">
                {regState.error as string}
                {regState.details && Object.keys(regState.details).length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-xs text-red-300/70">
                    {Object.entries(regState.details).map(([field, errors]: [string, any]) => (
                      <li key={field}>
                        <span className="capitalize font-medium">{field}:</span>{' '}
                        {Array.isArray(errors) ? errors.join(', ') : errors}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <SubmitBtn />
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Al registrarte aceptas nuestros términos de servicio y política de privacidad.
          </p>
        </div>
      </div>
    </div>
  );
}
