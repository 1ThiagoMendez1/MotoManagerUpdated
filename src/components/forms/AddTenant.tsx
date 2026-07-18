'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface FormState {
  name: string;
  email: string;
  phone: string;
  domain: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  domain?: string;
  general?: string;
}

export default function AddTenant() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    domain: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del tenant es requerido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email del tenant es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email debe tener un formato válido';
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'El teléfono debe tener un formato válido';
    }

    if (formData.domain && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.domain)) {
      newErrors.domain = 'El dominio debe tener un formato válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          domain: formData.domain.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.details) {
          // Handle validation errors
          const fieldErrors: FormErrors = {};
          errorData.details.forEach((error: any) => {
            fieldErrors[error.path[0] as keyof FormErrors] = error.message;
          });
          setErrors(fieldErrors);
        } else if (response.status === 409) {
          setErrors({ general: errorData.error || 'Ya existe un tenant con estos datos' });
        } else {
          setErrors({ general: errorData.error || 'Error al crear el tenant' });
        }
        return;
      }

      const tenant = await response.json();

      // Redirect to tenant management page or show success message
      router.push('/admin/tenants');
    } catch (error) {
      console.error('Error creating tenant:', error);
      setErrors({ general: 'Error de conexión. Inténtalo de nuevo.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Registrar Nuevo Tenant</CardTitle>
        <CardDescription>
          Crea un nuevo tenant para gestionar una organización independiente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Tenant *</Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ej: Taller Central"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email del Tenant *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Ej: admin@tallereentral.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Ej: +57 300 123 4567"
              disabled={isLoading}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Dominio (opcional)</Label>
            <Input
              id="domain"
              name="domain"
              type="text"
              value={formData.domain}
              onChange={handleInputChange}
              placeholder="Ej: tallercentral.com"
              disabled={isLoading}
            />
            {errors.domain && (
              <p className="text-sm text-red-600">{errors.domain}</p>
            )}
            <p className="text-xs text-gray-500">
              Dominio personalizado para el tenant (opcional)
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear Tenant'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}