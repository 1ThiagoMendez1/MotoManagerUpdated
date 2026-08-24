'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ArrowRight,
  Calendar,
  Rocket,
  Sparkles,
  Lock,
  PieChart,
ShoppingCart} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { AddWorkOrder } from '@/components/forms/AddWorkOrder';
import type { Motorcycle, Technician } from '@/lib/types';
import { getPlanLimits } from '@/lib/constants/plans';
import { useToast } from '@/hooks/use-toast';

interface DashboardMenuProps {
  role: string;
  customPermissions?: string[] | null;
  userName: string;
  workshopName: string;
  subscriptionPlan?: string;
  motorcycles: Motorcycle[];
  technicians: Technician[];
}

export function DashboardMenu({ 
  role, 
  customPermissions,
  userName, 
  workshopName, 
  subscriptionPlan = 'monthly',
  motorcycles,
  technicians
}: DashboardMenuProps) {
  const { toast } = useToast();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModule, setUpgradeModule] = useState<{ title: string; description: string } | null>(null);
  const planLimits = getPlanLimits(subscriptionPlan || 'basic');

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
  };

  const itemVariants: any = {
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
  const canAccessWorkOrders = hasPermission(role, '/work-orders', customPermissions);
  const canAccessCustomers = hasPermission(role, '/customers', customPermissions);
  const canAccessMotorcycles = hasPermission(role, '/motorcycles', customPermissions);
  const canAccessDashboard = hasPermission(role, '/dashboard', customPermissions);
  const canAccessInventory = hasPermission(role, '/inventory', customPermissions);
  const canAccessTechnicians = hasPermission(role, '/technicians', customPermissions);
  const canAccessSales = hasPermission(role, '/sales', customPermissions);
  const canAccessPurchases = hasPermission(role, '/purchases', customPermissions);
  const canAccessTeam = hasPermission(role, '/team', customPermissions);
  const canAccessTickets = hasPermission(role, '/tickets', customPermissions);
  const canAccessAppointments = hasPermission(role, '/appointments', customPermissions);
  const canAccessAccounting = hasPermission(role, '/accounting', customPermissions);
  const canAccessServices = hasPermission(role, '/services', customPermissions);

  // Calcular cantidad de tarjetas para sub-grids dinámicos
  const secondaryCardsCount = [canAccessCustomers, canAccessMotorcycles, canAccessInventory, canAccessServices, canAccessSales, canAccessAppointments, canAccessAccounting].filter(Boolean).length;
  const tertiaryCardsCount = [canAccessTechnicians, canAccessTeam, canAccessTickets].filter(Boolean).length;

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
          {secondaryCardsCount > 0 && (
            <div className={cn(
              "md:col-span-8 lg:col-span-12 grid gap-3 lg:gap-4",
              secondaryCardsCount === 1 ? "grid-cols-1" :
              secondaryCardsCount === 2 ? "grid-cols-1 sm:grid-cols-2" :
              secondaryCardsCount === 3 ? "grid-cols-1 sm:grid-cols-3" :
              secondaryCardsCount === 4 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" :
              "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
            )}>
              {canAccessCustomers && (
                <div id="tour-customers">
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
                <div id="tour-motorcycles">
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
                <div id="tour-inventory">
                  <AppleGlassCard 
                    href="/inventory"
                    icon={Warehouse}
                    title="Inventario"
                    description="Control de repuestos y stock."
                    iconBg="bg-amber-500"
                    locked={!planLimits.has_inventory}
                    onClickLocked={() => {
                      setUpgradeModule({ title: 'Inventario', description: 'Control de repuestos y stock.' });
                      setShowUpgradeModal(true);
                    }}
                  />
                </div>
              )}

              {/* Catálogo de Servicios */}
              {canAccessServices && (
                <div id="tour-services">
                  <AppleGlassCard 
                    href="/services"
                    icon={Sparkles}
                    title="Servicios"
                    description="Catálogo, precios y categorías."
                    iconBg="bg-fuchsia-500"
                  />
                </div>
              )}
              
              {canAccessSales && (
                <div id="tour-sales">
                  <AppleGlassCard 
                    href="/sales"
                    icon={DollarSign}
                    title="Ventas"
                    description="Punto de venta y caja."
                    iconBg="bg-green-500"
                    locked={!planLimits.has_sales}
                    onClickLocked={() => {
                      setUpgradeModule({ title: 'Ventas', description: 'Punto de venta y caja.' });
                      setShowUpgradeModal(true);
                    }}
                  />
                </div>
              )}

              {canAccessAppointments && (
                <div id="tour-appointments">
                  <AppleGlassCard 
                    href="/appointments"
                    icon={Calendar}
                    title="Citas"
                    description="Gestión y programación de citas."
                    iconBg="bg-blue-500"
                    locked={!planLimits.has_appointments}
                    onClickLocked={() => {
                      setUpgradeModule({ title: 'Citas', description: 'Gestión y programación de citas.' });
                      setShowUpgradeModal(true);
                    }}
                  />
                </div>
              )}
              
              {canAccessAccounting && (
                <div id="tour-accounting">
                  <AppleGlassCard 
                    href="/accounting"
                    icon={PieChart}
                    title="Contabilidad"
                    description="Finanzas, proyecciones y compras."
                    iconBg="bg-indigo-600"
                    locked={!planLimits.has_accounting}
                    onClickLocked={() => {
                      setUpgradeModule({ title: 'Contabilidad y Finanzas', description: 'Análisis financiero, proyecciones, flujo de caja y compras detalladas.' });
                      setShowUpgradeModal(true);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* 5. Administración y Equipo */}
          {tertiaryCardsCount > 0 && (
            <div className={cn(
              "md:col-span-8 lg:col-span-12 grid gap-3 lg:gap-4",
              tertiaryCardsCount === 1 ? "grid-cols-1" :
              tertiaryCardsCount === 2 ? "grid-cols-1 sm:grid-cols-2" :
              "grid-cols-1 sm:grid-cols-3"
            )}>
              {canAccessTechnicians && (
                <div id="tour-technicians">
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
                <div id="tour-team">
                  <AppleGlassCardSmall 
                    href="/team"
                    icon={UserCog}
                    title="Permisos"
                    description="Accesos al sistema."
                    iconBg="bg-purple-500"
                    locked={planLimits.permissions_level === 'none'}
                    onClickLocked={() => {
                      setUpgradeModule({ title: 'Permisos', description: 'Accesos al sistema y roles.' });
                      setShowUpgradeModal(true);
                    }}
                  />
                </div>
              )}
              
              {canAccessTickets && (
                <div id="tour-tickets">
                  <AppleGlassCardSmall 
                    href="/tickets"
                    icon={LifeBuoy}
                    title="Soporte"
                    description="Centro de ayuda y tickets."
                    iconBg="bg-rose-500"
                  />
                </div>
              )}
            </div>
          )}
          {/* Upgrade Modal */}
          <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
            <DialogContent className="sm:max-w-md bg-gradient-to-b from-[#1a1c29] to-[#0f111a] border-white/10 shadow-2xl p-0 overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-blue-500/20 to-transparent opacity-50 pointer-events-none" />
              
              <div className="p-8 flex flex-col items-center text-center relative z-10">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 rotate-3 transition-transform hover:rotate-6">
                  <Rocket className="w-10 h-10 text-white" />
                </div>
                
                <DialogTitle className="text-2xl font-bold text-white mb-2 tracking-tight">
                  Desbloquea MotoManager Pro
                </DialogTitle>
                
                <DialogDescription className="text-muted-foreground text-base mb-6 px-2">
                  El módulo de <strong className="text-white font-semibold">{upgradeModule?.title}</strong> está reservado para planes superiores. Mejora tu plan hoy y lleva el control de tu taller al siguiente nivel.
                </DialogDescription>
                
                <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mb-8 flex items-start gap-4 text-left">
                  <div className="mt-1 p-1.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">Lo que te estás perdiendo</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Acceso completo a inventario, punto de venta, agendamiento de citas, roles de usuario y notificaciones ilimitadas por WhatsApp.
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <Button variant="outline" className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={() => setShowUpgradeModal(false)}>
                    Quizás después
                  </Button>
                  <Link href="/planes" className="flex-1">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 border-0">
                      Ver Planes <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
  locked?: boolean;
  onClickLocked?: () => void;
}

function AppleGlassCard({ href, icon: Icon, title, description, iconBg, locked, onClickLocked }: AppleGlassCardProps) {
  const content = (
    <div className={cn("relative h-full min-h-[140px] sm:min-h-[160px] p-4 sm:p-5 rounded-3xl bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[50px] border border-foreground/[0.08] dark:border-white/[0.1] shadow-lg overflow-hidden transition-all duration-300 hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08] hover:border-foreground/[0.15] dark:hover:border-white/[0.2] active:scale-[0.98] flex flex-col min-w-0", locked && "opacity-80 grayscale-[50%]")}>
      
      {locked && (
        <div className="absolute top-3 right-3 p-1.5 rounded-full bg-foreground/10 text-foreground/50 z-20">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
      )}
      
      <div className="relative z-10 flex flex-col h-full min-w-0">
        <div className={cn("p-2 rounded-2xl text-white w-fit mb-3 shadow-sm", iconBg, locked && "opacity-70")}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold text-foreground tracking-tight mb-1 truncate">{title}</h3>
        <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-auto line-clamp-2">{description}</p>
      </div>
      
    </div>
  );

  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }} className="h-full">
      {locked ? (
        <button type="button" onClick={onClickLocked} className="block w-full h-full text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-3xl min-w-0">
          {content}
        </button>
      ) : (
        <Link href={href} className="block h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-3xl min-w-0">
          {content}
        </Link>
      )}
    </motion.div>
  );
}

function AppleGlassCardSmall({ href, icon: Icon, title, description, iconBg, locked, onClickLocked }: AppleGlassCardProps) {
  const content = (
    <div className={cn("relative h-full p-4 sm:p-5 rounded-2xl bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[40px] border border-foreground/[0.08] dark:border-white/[0.1] transition-all duration-300 hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08] hover:border-foreground/[0.15] dark:hover:border-white/[0.2] active:scale-[0.98] min-w-0", locked && "opacity-80 grayscale-[50%]")}>
      
      {locked && (
        <div className="absolute top-2 right-2 p-1 rounded-full bg-foreground/10 text-foreground/50 z-20">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
      )}

      <div className="flex items-center gap-4 min-w-0">
        <div className={cn("p-2 rounded-xl text-white shadow-sm shrink-0", iconBg, locked && "opacity-70")}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground truncate">{title}</h3>
          <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{description}</p>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="h-full">
      {locked ? (
        <button type="button" onClick={onClickLocked} className="block w-full h-full text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl min-w-0">
          {content}
        </button>
      ) : (
        <Link href={href} className="block h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl min-w-0">
          {content}
        </Link>
      )}
    </motion.div>
  );
}
