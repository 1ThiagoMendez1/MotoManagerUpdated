'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Bike,
  Users,
  FileText,
  Warehouse,
  DollarSign,
  UserPlus,
  LayoutDashboard,
  UserCog,
  LifeBuoy,
  PlusCircle,
  ArrowRight
} from 'lucide-react';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { AddWorkOrder } from '@/components/forms/AddWorkOrder';
import type { Motorcycle, Technician } from '@/lib/types';

interface DashboardMenuProps {
  role: string;
  userName?: string;
  workshopName?: string;
  motorcycles?: Motorcycle[];
  technicians?: Technician[];
}

export function DashboardMenu({ 
  role, 
  userName = 'Usuario', 
  workshopName = 'Tu Taller',
  motorcycles = [],
  technicians = []
}: DashboardMenuProps) {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  // Obtener saludo dinámico
  const hour = new Date().getHours();
  let greeting = 'Buenos días';
  if (hour >= 12 && hour < 19) {
    greeting = 'Buenas tardes';
  } else if (hour >= 19 || hour < 5) {
    greeting = 'Buenas noches';
  }

  // Módulos (se mantienen los permisos)
  const canAccessWorkOrders = hasPermission(role, '/work-orders');
  const canAccessCustomers = hasPermission(role, '/customers');
  const canAccessMotorcycles = hasPermission(role, '/motorcycles');
  const canAccessDashboard = hasPermission(role, '/dashboard');
  const canAccessInventory = hasPermission(role, '/inventory');
  const canAccessTechnicians = hasPermission(role, '/technicians');
  const canAccessSales = hasPermission(role, '/sales');
  const canAccessTeam = hasPermission(role, '/team');
  const canAccessTickets = hasPermission(role, '/tickets');

  // Calcular espacios dinámicos para que el layout siempre se vea lleno y proporcionado
  const secondaryCardsCount = [canAccessCustomers, canAccessMotorcycles, canAccessInventory, canAccessSales].filter(Boolean).length;
  let secondarySpanLg = "lg:col-span-3";
  let secondarySpanMd = "md:col-span-4";
  if (secondaryCardsCount === 1) {
    secondarySpanLg = "lg:col-span-12";
    secondarySpanMd = "md:col-span-8";
  } else if (secondaryCardsCount === 2) {
    secondarySpanLg = "lg:col-span-6";
    secondarySpanMd = "md:col-span-4";
  } else if (secondaryCardsCount === 3) {
    secondarySpanLg = "lg:col-span-4";
    secondarySpanMd = "md:col-span-4";
  }

  const tertiaryCardsCount = [canAccessTechnicians, canAccessTeam, canAccessTickets].filter(Boolean).length;
  let tertiarySpanLg = "lg:col-span-4";
  let tertiarySpanMd = "md:col-span-4";
  if (tertiaryCardsCount === 1) {
    tertiarySpanLg = "lg:col-span-12";
    tertiarySpanMd = "md:col-span-8";
  } else if (tertiaryCardsCount === 2) {
    tertiarySpanLg = "lg:col-span-6";
    tertiarySpanMd = "md:col-span-4";
  }

  return (
    <div className="w-full relative">
      
      {/* Background orbs para que el Liquid Glass resalte como en Apple Control Center */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none z-0 mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-500/20 rounded-full blur-[120px] pointer-events-none z-0 mix-blend-screen" />
      <div className="absolute top-[30%] left-[50%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0 mix-blend-screen" />

      <div className="w-full mx-auto z-10">
        
        {/* Header / Apertura Personalizada */}
        <motion.div 
          id="tour-greeting"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-4 lg:mb-6 mt-1"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-1">
            {greeting}, {userName}.
          </h1>
          <p className="text-sm sm:text-base text-foreground/70 flex items-center gap-2">
            <span>Tu taller <span className="font-medium text-foreground">{workshopName}</span>, bajo control.</span>
          </p>
        </motion.div>

        {/* Bento Grid 12 Columnas (Organización de la Imagen 1) */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-3 lg:gap-4"
        >
          {/* 1. Centro de Operaciones (Hero Card) - Órdenes de Trabajo */}
          {canAccessWorkOrders && (
            <motion.div id="tour-work-orders" variants={itemVariants} className={cn(
              "flex flex-col h-full group",
              canAccessDashboard ? "md:col-span-8 lg:col-span-8" : "md:col-span-8 lg:col-span-12"
            )}>
              <div className="relative h-full min-h-[180px] sm:min-h-[200px] flex flex-col justify-between p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[50px] border border-foreground/[0.08] dark:border-white/[0.1] shadow-xl overflow-hidden transition-all duration-300 hover:bg-foreground/[0.05] dark:hover:bg-white/[0.08] hover:border-foreground/[0.15] dark:hover:border-white/[0.2]">
                {/* Glow effect inside */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none transition-colors duration-500" />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-2xl bg-blue-500 text-white shadow-md">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Órdenes de Trabajo</h2>
                  </div>
                  <p className="text-muted-foreground max-w-md text-xs sm:text-sm mb-5 font-medium line-clamp-2">
                    El corazón de tu taller. Gestiona reparaciones activas y entregas.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 mt-auto">
                    <div className="flex-1">
                      <AddWorkOrder 
                        motorcycles={motorcycles} 
                        technicians={technicians}
                        customTrigger={
                          <button className="w-full py-3.5 px-6 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]">
                            <PlusCircle className="w-5 h-5" />
                            Nueva Orden
                          </button>
                        }
                      />
                    </div>
                    <Link href="/work-orders" className="flex-1">
                      <button className="w-full py-3.5 px-6 rounded-2xl bg-foreground/5 hover:bg-foreground/10 text-foreground font-medium border border-foreground/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                        Ver todas
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. Resumen General / Dashboard */}
          {canAccessDashboard && (
            <div id="tour-dashboard" className="md:col-span-8 lg:col-span-4">
              <AppleGlassCard 
                href="/dashboard"
                icon={LayoutDashboard}
                title="Dashboard"
                description="Visión global de finanzas y rendimiento."
                iconBg="bg-indigo-500"
              />
            </div>
          )}

          {/* 3. Bloque Operativo Relacionado: Secundarios */}
          {canAccessCustomers && (
            <div id="tour-customers" className={cn(secondarySpanMd, secondarySpanLg)}>
              <AppleGlassCard 
                href="/customers"
                icon={UserPlus}
                title="Clientes"
                description="Directorio y contactos."
                iconBg="bg-emerald-500"
              />
            </div>
          )}
          
          {canAccessMotorcycles && (
            <div id="tour-motorcycles" className={cn(secondarySpanMd, secondarySpanLg)}>
              <AppleGlassCard 
                href="/motorcycles"
                icon={Bike}
                title="Motocicletas"
                description="Historial vehicular."
                iconBg="bg-orange-500"
              />
            </div>
          )}

          {canAccessInventory && (
            <div id="tour-inventory" className={cn(secondarySpanMd, secondarySpanLg)}>
              <AppleGlassCard 
                href="/inventory"
                icon={Warehouse}
                title="Inventario"
                description="Control de repuestos y stock."
                iconBg="bg-amber-500"
              />
            </div>
          )}
          
          {canAccessSales && (
            <div id="tour-sales" className={cn(secondarySpanMd, secondarySpanLg)}>
              <AppleGlassCard 
                href="/sales"
                icon={DollarSign}
                title="Ventas"
                description="Punto de venta y caja."
                iconBg="bg-green-500"
              />
            </div>
          )}

          {/* 5. Administración y Equipo */}
          {canAccessTechnicians && (
            <div id="tour-technicians" className={cn(tertiarySpanMd, tertiarySpanLg)}>
              <AppleGlassCardSmall 
                href="/technicians"
                icon={Users}
                title="Técnicos"
                description="Rendimiento del equipo."
                iconBg="bg-cyan-500"
              />
            </div>
          )}
          
          {canAccessTeam && (
            <div id="tour-team" className={cn(tertiarySpanMd, tertiarySpanLg)}>
              <AppleGlassCardSmall 
                href="/team"
                icon={UserCog}
                title="Permisos"
                description="Accesos al sistema."
                iconBg="bg-purple-500"
              />
            </div>
          )}
          
          {canAccessTickets && (
            <div id="tour-tickets" className={cn(tertiarySpanMd, tertiarySpanLg)}>
              <AppleGlassCardSmall 
                href="/tickets"
                icon={LifeBuoy}
                title="Soporte"
                description="Centro de ayuda y tickets."
                iconBg="bg-rose-500"
              />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// Componentes internos Apple Liquid Glass

interface AppleGlassCardProps {
  href: string;
  icon: any;
  title: string;
  description: string;
  iconBg: string;
}

function AppleGlassCard({ href, icon: Icon, title, description, iconBg }: AppleGlassCardProps) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }} className="h-full">
      <Link href={href} className="block h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-3xl min-w-0">
        <div className="relative h-full min-h-[140px] sm:min-h-[160px] p-4 sm:p-5 rounded-3xl bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[50px] border border-foreground/[0.08] dark:border-white/[0.1] shadow-lg overflow-hidden transition-all duration-300 hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08] hover:border-foreground/[0.15] dark:hover:border-white/[0.2] active:scale-[0.98] flex flex-col min-w-0">
          
          <div className="relative z-10 flex flex-col h-full min-w-0">
            <div className={cn("p-2 rounded-2xl text-white w-fit mb-3 shadow-sm", iconBg)}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground tracking-tight mb-1 truncate">{title}</h3>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-auto line-clamp-2">{description}</p>
          </div>
          
        </div>
      </Link>
    </motion.div>
  );
}

function AppleGlassCardSmall({ href, icon: Icon, title, description, iconBg }: AppleGlassCardProps) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="h-full">
      <Link href={href} className="block h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl min-w-0">
        <div className="relative h-full p-4 sm:p-5 rounded-2xl bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[40px] border border-foreground/[0.08] dark:border-white/[0.1] transition-all duration-300 hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08] hover:border-foreground/[0.15] dark:hover:border-white/[0.2] active:scale-[0.98] min-w-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className={cn("p-2 rounded-xl text-white shadow-sm shrink-0", iconBg)}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground truncate">{title}</h3>
              <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{description}</p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
