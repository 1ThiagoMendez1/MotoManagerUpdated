'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { hasPermission } from '@/lib/permissions';

interface TourHandlerProps {
  role?: string;
}

export function TourHandler({ role = 'owner' }: TourHandlerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasRunTour = useRef(false);

  useEffect(() => {
    if (searchParams.get('tour') === 'true' && !hasRunTour.current) {
      hasRunTour.current = true;

      const allSteps = [
        {
          element: 'h1',
          popover: {
            title: '¡Bienvenido a MotoManager! 🏍️',
            description: 'Estamos felices de tenerte aquí. Vamos a dar un rápido recorrido para que conozcas todos los módulos que te ayudarán a llevar tu taller al siguiente nivel.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[href="/dashboard"]',
          popover: {
            title: 'Dashboard General',
            description: 'Aquí verás el resumen financiero, alertas importantes, ingresos, gastos y las motos que tienes actualmente en servicio.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[href="/customers"]',
          popover: {
            title: 'Clientes',
            description: 'Administra la información de contacto de tus clientes. Construye relaciones duraderas y envía recordatorios fácilmente.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[href="/motorcycles"]',
          popover: {
            title: 'Motocicletas',
            description: 'Registra y administra las motocicletas de tus clientes. Mantén el historial completo de mantenimientos de cada vehículo.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[href="/work-orders"]',
          popover: {
            title: 'Órdenes de Trabajo',
            description: 'El corazón del taller. Crea, asigna, presupuesta y haz seguimiento a todas las reparaciones y servicios que realizas.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[href="/inventory"]',
          popover: {
            title: 'Inventario',
            description: 'Controla tu stock de repuestos y accesorios. Recibe alertas de stock crítico y administra tus proveedores.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[href="/technicians"]',
          popover: {
            title: 'Técnicos',
            description: 'Administra tu equipo de mecánicos, asigna órdenes de trabajo y mide su rendimiento.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[href="/sales"]',
          popover: {
            title: 'Ventas y Finanzas',
            description: 'Registra ventas directas de mostrador y lleva el control exacto de tus ingresos y egresos diarios.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[href="/team"]',
          popover: {
            title: 'Usuarios y Permisos',
            description: 'Si tienes administradores o asistentes, aquí puedes crear sus cuentas y controlar a qué partes del sistema tienen acceso.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[href="/tickets"]',
          popover: {
            title: 'Soporte y Tickets',
            description: 'Revisa y responde las solicitudes de tus clientes de manera organizada.',
            side: "bottom",
            align: 'start'
          }
        }
      ];

      // Filter steps based on role permissions
      const filteredSteps = allSteps.filter(step => {
        if (step.element === 'h1') return true;
        const match = step.element.match(/href="([^"]+)"/);
        if (match && match[1]) {
          return hasPermission(role, match[1]);
        }
        return true;
      });

      const tourDriver = driver({
        showProgress: true,
        animate: true,
        popoverClass: 'premium-tour-popover',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Anterior',
        doneBtnText: '¡Entendido!',
        steps: filteredSteps as any,
        onDestroyStarted: () => {
          tourDriver.destroy();
          // Remove query param without triggering full page reload
          router.replace('/');
        },
      });

      // Small delay to ensure rendering is complete before attaching tour
      setTimeout(() => {
        tourDriver.drive();
      }, 500);
    }
  }, [searchParams, router, role]);

  return null;
}
