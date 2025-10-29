'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wrench, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function ContactPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!name || !email || !phone) {
        setError('Por favor, completa todos los campos.');
        setIsLoading(false);
        return;
    }

    // Simulación de envío de formulario
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('Datos de contacto (simulado):', { name, email, phone });
    toast({
        title: "¡Gracias por tu interés!",
        description: "Hemos recibido tus datos. Pronto nos pondremos en contacto contigo.",
    })
    
    // Redirigir al login después de un breve momento
    setTimeout(() => {
        router.push('/login');
    }, 2000);
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm bg-white/10 backdrop-blur-sm border-white/20 text-white">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
                <Wrench className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-white">MotoManager</h1>
            </div>
            <CardTitle className="text-2xl">Contacta con Nosotros</CardTitle>
            <CardDescription className="text-white/80">Déjanos tus datos y te contactaremos para empezar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-white/10 border-white/20 placeholder:text-white/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border-white/20 placeholder:text-white/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Número de Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Tu número de teléfono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="bg-white/10 border-white/20"
              />
            </div>
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <Send className="mr-2" />
                )}
                {isLoading ? 'Enviando...' : 'Enviar Solicitud'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-white/70">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
