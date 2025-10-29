'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  domain?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  name: string;
  domain: string;
}

interface FormErrors {
  name?: string;
  domain?: string;
  general?: string;
}

interface EditTenantProps {
  tenantId: string;
}

export default function EditTenant({ tenantId }: EditTenantProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [formData, setFormData] = useState<FormState>({
    name: '',
    domain: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const response = await fetch(`/api/tenants/${tenantId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch tenant');
        }
        const tenant: Tenant = await response.json();
        setFormData({
          name: tenant.name,
          domain: tenant.domain || '',
        });
      } catch (error) {
        console.error('Error fetching tenant:', error);
        setErrors({ general: 'Error al cargar los datos del tenant' });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchTenant();
  }, [tenantId]);

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
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
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
        } else {
          setErrors({ general: errorData.error || 'Error al actualizar el tenant' });
        }
        return;
      }

      const tenant = await response.json();

      // Redirect to tenant management page or show success message
      router.push('/admin/tenants');
    } catch (error) {
      console.error('Error updating tenant:', error);
      setErrors({ general: 'Error de conexión. Inténtalo de nuevo.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Cargando...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Editar Tenant</CardTitle>
        <CardDescription>
          Modifica la información del tenant seleccionado.
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

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Tenant'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}