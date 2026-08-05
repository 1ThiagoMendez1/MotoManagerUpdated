'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building2, User, Phone, MapPin, Hash, Mail,
  ArrowLeft, Save, CheckCircle2, AlertCircle, Loader2,
  Wrench, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProfileData, updateProfileData } from '@/lib/actions/profile';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

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
  workshopMapsLink?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapsLinkText, setMapsLinkText] = useState('');
  const [editingSections, setEditingSections] = useState({ workshop: false, owner: false });
  const [manualAddressEdited, setManualAddressEdited] = useState(false);
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

  const toggleSectionEdit = (section: 'workshop' | 'owner') => {
    setEditingSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderInput = (
    id: keyof ProfileData,
    label: string,
    icon: React.ReactNode,
    type: string,
    placeholder: string,
    isEditing: boolean,
    required: boolean = false
  ) => {
    const val = data[id] || '';
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id as string} className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          {icon} {label} {required && '*'}
        </label>
        <input
          id={id as string}
          name={id as string}
          type={type}
          required={required && isEditing} // Only enforce required if they are editing or if we really need it, actually we'll keep it required if it's required
          value={val}
          onChange={(e) => {
            setData({ ...data, [id]: e.target.value });
            if (id === 'workshopCity') setManualAddressEdited(true);
          }}
          placeholder={placeholder}
          readOnly={!isEditing}
          className={`w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none ${
            isEditing 
              ? 'bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary/60' 
              : 'bg-muted/20 border border-transparent text-foreground/80 cursor-default'
          }`}
        />
      </div>
    );
  };

  useEffect(() => {
    getProfileData().then((d) => {
      setData(d as any);
      setMapsLinkText(d.workshopMapsLink || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newMapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
        setMapsLinkText(newMapsLink);
        
        const mapsInput = document.getElementById('workshopMapsLink') as HTMLInputElement;
        if (mapsInput) mapsInput.value = newMapsLink;

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const geodata = await res.json();
          if (geodata && geodata.address) {
            const road = geodata.address.road || '';
            const houseNumber = geodata.address.house_number || '';
            const suburb = geodata.address.suburb || geodata.address.neighbourhood || '';
            const cityName = geodata.address.city || geodata.address.town || geodata.address.village || geodata.address.county || '';
            
            let exactAddress = `${road} ${houseNumber}`.trim();
            if (suburb) exactAddress += exactAddress ? `, ${suburb}` : suburb;
            if (!exactAddress) exactAddress = geodata.display_name.split(',')[0];
            
            setData(prev => ({
              ...prev,
              workshopAddress: exactAddress || prev.workshopAddress,
              workshopCity: cityName || prev.workshopCity
            }));
            setManualAddressEdited(false);
          }
        } catch (e) {
          console.error("Geocoding error:", e);
        }
        
        setIsLocating(false);
      },
      (error) => {
        console.error("Error obteniendo ubicación:", error);
        alert("No se pudo obtener la ubicación exacta. Verifica los permisos de tu navegador o GPS.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (manualAddressEdited && editingSections.workshop) {
        try {
          const address = formData.get('workshopAddress') as string;
          const city = formData.get('workshopCity') as string;
          if (address && city) {
            const query = `${address}, ${city}, Colombia`;
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const geoData = await res.json();
            if (geoData && geoData.length > 0) {
              const { lat, lon } = geoData[0];
              formData.set('workshopMapsLink', `https://maps.google.com/?q=${lat},${lon}`);
            }
          }
        } catch (err) {
          console.error("Geocoding manual address error:", err);
        }
      }

      const result = await updateProfileData(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setEditingSections({ workshop: false, owner: false });
        toast({
          title: '¡Datos actualizados!',
          description: 'Tu perfil ha sido guardado exitosamente.',
          variant: 'default',
        });
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
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm">Información del Taller</h2>
                    <p className="text-xs text-muted-foreground">Nombre, contacto y ubicación</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSectionEdit('workshop')}
                  className={`transition-colors p-2 rounded-lg border ${editingSections.workshop ? 'bg-primary text-primary-foreground border-primary shadow-sm hover:opacity-90' : 'bg-background/80 text-muted-foreground hover:text-primary border-border/40 hover:bg-background'}`}
                  title="Editar Información del Taller"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 gap-4">

                {/* Nombre del taller */}
                {renderInput('workshopName', 'Nombre del taller', <Wrench className="w-3.5 h-3.5" />, 'text', 'Ej: Moto Service El Rápido', editingSections.workshop, true)}

                {/* Teléfono del taller */}
                {renderInput('workshopPhone', 'Teléfono del taller', <Phone className="w-3.5 h-3.5" />, 'tel', 'Ej: 3001234567', editingSections.workshop)}

                {/* Dirección y Botón GPS */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="workshopAddress" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Dirección
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="workshopAddress"
                      name="workshopAddress"
                      type="text"
                      value={data.workshopAddress || ''}
                      onChange={(e) => {
                        setData({ ...data, workshopAddress: e.target.value });
                        setManualAddressEdited(true);
                      }}
                      placeholder="Ej: Calle 10 # 5-32, Local 3"
                      readOnly={!editingSections.workshop}
                      className={`w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none flex-1 ${
                        editingSections.workshop 
                          ? 'bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary/60' 
                          : 'bg-muted/20 border border-transparent text-foreground/80 cursor-default'
                      }`}
                    />
                    <input type="hidden" id="workshopMapsLink" name="workshopMapsLink" value={mapsLinkText} />
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isLocating || !editingSections.workshop}
                      className="flex items-center justify-center gap-2 px-4 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium rounded-xl transition-colors disabled:opacity-50 shrink-0"
                    >
                      {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                      <span className="hidden sm:inline">Tomar ubicación</span>
                    </button>
                  </div>
                  {mapsLinkText && (
                    <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3 w-3" /> Coordenadas capturadas
                    </p>
                  )}
                </div>

                {/* Ciudad y NIT en grid */}
                <div className="grid grid-cols-2 gap-3">
                  {renderInput('workshopCity', 'Ciudad', <MapPin className="w-3.5 h-3.5" />, 'text', 'Ej: Bogotá', editingSections.workshop)}
                  {renderInput('workshopNit', 'NIT', <Hash className="w-3.5 h-3.5" />, 'text', 'Ej: 900.123.456-7', editingSections.workshop)}
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
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm">Datos del Propietario</h2>
                    <p className="text-xs text-muted-foreground">Tu nombre y contacto personal</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSectionEdit('owner')}
                  className={`transition-colors p-2 rounded-lg border ${editingSections.owner ? 'bg-primary text-primary-foreground border-primary shadow-sm hover:opacity-90' : 'bg-background/80 text-muted-foreground hover:text-primary border-border/40 hover:bg-background'}`}
                  title="Editar Datos del Propietario"
                >
                  <Pencil className="w-4 h-4" />
                </button>
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
                {renderInput('ownerName', 'Nombre completo', <User className="w-3.5 h-3.5" />, 'text', 'Ej: Camilo Sánchez', editingSections.owner, true)}

                {/* Teléfono del propietario */}
                {renderInput('ownerPhone', 'Celular / WhatsApp', <Phone className="w-3.5 h-3.5" />, 'tel', 'Ej: 3109876543', editingSections.owner)}
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
            {(editingSections.workshop || editingSections.owner) && (
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
            )}

          </div>
        </form>
      </div>
    </div>
  );
}
