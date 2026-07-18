'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building2, User, Phone, MapPin, Hash, Mail,
  ArrowLeft, Save, CheckCircle2, AlertCircle, Loader2,
  Wrench, City
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProfileData, updateProfileData } from '@/lib/actions/profile';
import Link from 'next/link';

interface ProfileData {
  workshopName: string;
  workshopPhone: string;
  workshopAddress: string;
  workshopCity: string;
  workshopNit: string;
  ownerName: string;
  ownerPhone: string;
  email: string;
  userRole?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProfileData>({
    workshopName: '',
    workshopPhone: '',
    workshopAddress: '',
    workshopCity: '',
    workshopNit: '',
    ownerName: '',
    ownerPhone: '',
    email: '',
  });

  useEffect(() => {
    getProfileData().then((d) => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateProfileData(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.push('/dashboard');
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Actualizar Datos</h1>
            <p className="text-sm text-muted-foreground">Edita la información de tu taller y perfil</p>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">

            {/* Sección: Datos del Taller */}
            {data.userRole === 'owner' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm"
              >
              {/* Card Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-primary/5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm">Información del Taller</h2>
                  <p className="text-xs text-muted-foreground">Nombre, contacto y ubicación</p>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 gap-4">

                {/* Nombre del taller */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="workshopName" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" /> Nombre del taller *
                  </label>
                  <input
                    id="workshopName"
                    name="workshopName"
                    type="text"
                    required
                    defaultValue={data.workshopName}
                    placeholder="Ej: Moto Service El Rápido"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                  />
                </div>

                {/* Teléfono del taller */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="workshopPhone" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Teléfono del taller
                  </label>
                  <input
                    id="workshopPhone"
                    name="workshopPhone"
                    type="tel"
                    defaultValue={data.workshopPhone}
                    placeholder="Ej: 3001234567"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                  />
                </div>

                {/* Dirección */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="workshopAddress" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Dirección
                  </label>
                  <input
                    id="workshopAddress"
                    name="workshopAddress"
                    type="text"
                    defaultValue={data.workshopAddress}
                    placeholder="Ej: Calle 10 # 5-32, Local 3"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                  />
                </div>

                {/* Ciudad y NIT en grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="workshopCity" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Ciudad
                    </label>
                    <input
                      id="workshopCity"
                      name="workshopCity"
                      type="text"
                      defaultValue={data.workshopCity}
                      placeholder="Ej: Bogotá"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="workshopNit" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" /> NIT
                    </label>
                    <input
                      id="workshopNit"
                      name="workshopNit"
                      type="text"
                      defaultValue={data.workshopNit}
                      placeholder="Ej: 900.123.456-7"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
            )}

            {/* Sección: Datos del Propietario */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-primary/5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm">Datos del Propietario</h2>
                  <p className="text-xs text-muted-foreground">Tu nombre y contacto personal</p>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 gap-4">

                {/* Email (solo lectura) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Correo electrónico
                  </label>
                  <div className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed select-none">
                    {data.email}
                  </div>
                  <p className="text-xs text-muted-foreground/60">El email no puede ser modificado desde aquí.</p>
                </div>

                {/* Nombre del propietario */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ownerName" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Nombre completo *
                  </label>
                  <input
                    id="ownerName"
                    name="ownerName"
                    type="text"
                    required
                    defaultValue={data.ownerName}
                    placeholder="Ej: Camilo Sánchez"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                  />
                </div>

                {/* Teléfono del propietario */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ownerPhone" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Celular / WhatsApp
                  </label>
                  <input
                    id="ownerPhone"
                    name="ownerPhone"
                    type="tel"
                    defaultValue={data.ownerPhone}
                    placeholder="Ej: 3109876543"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                  />
                </div>
              </div>
            </motion.div>

            {/* Feedback messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </motion.div>
            )}


            {/* Botón guardar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-12 rounded-xl font-semibold text-sm bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-primary-foreground shadow-lg shadow-primary/20 transition-all gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </motion.div>

          </div>
        </form>
      </div>
    </div>
  );
}
