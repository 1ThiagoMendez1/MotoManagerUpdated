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
  LifeBuoy
} from 'lucide-react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { hasPermission } from '@/lib/permissions';

const allMenuItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", description: "Resumen de finanzas y taller" },
  { href: "/customers", icon: UserPlus, label: "Clientes", description: "Administra tus clientes" },
  { href: "/motorcycles", icon: Bike, label: "Motocicletas", description: "Gestiona los vehículos" },
  { href: "/work-orders", icon: FileText, label: "Órdenes de Trabajo", description: "Administra las reparaciones" },
  { href: "/inventory", icon: Warehouse, label: "Inventario", description: "Controla tus repuestos" },
  { href: "/technicians", icon: Users, label: "Técnicos", description: "Administra tu equipo" },
  { href: "/sales", icon: DollarSign, label: "Ventas", description: "Revisa las transacciones" },
  { href: "/team", icon: UserCog, label: "Usuarios y Permisos", description: "Controla accesos al sistema" },
  { href: "/tickets", icon: LifeBuoy, label: "Tickets", description: "Soporte y seguimiento" },
];

export function DashboardMenu({ role }: { role: string }) {
  const menuItems = allMenuItems.filter(item => hasPermission(role, item.href));

  return (
    <main className="flex flex-col items-center justify-center w-full p-2 sm:p-4">
      <div className="text-center mb-4 px-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight font-space">Bienvenido a MotoManager</h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground mt-1 sm:mt-2">Selecciona una opción para comenzar a gestionar tu taller.</p>
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full max-w-7xl px-2 sm:px-4 mb-4">
        {menuItems.map(({ href, icon: Icon, label, description }) => (
          <Link href={href} key={href} className="block group">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
              className="relative h-full"
            >
              {/* Glow Effect */}
              <motion.div
                className="absolute -inset-4 rounded-3xl blur-2xl -z-20 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 4,
                  ease: "easeInOut",
                }}
              />

              <Card className="relative h-full rounded-xl p-4 sm:p-6 flex flex-col justify-center bg-card text-card-foreground shadow-[0px_-16px_24px_rgba(255,255,255,0.02)_inset] overflow-hidden border-border/40 group-hover:border-primary/50 transition-colors duration-300">
                {/* Animated Gradient Background on Hover */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 -z-10 transition-opacity duration-700"
                  animate={{ rotate: [0, 360] }}
                  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                  style={{
                    backgroundImage:
                      "radial-gradient(at 88% 40%, transparent 0px, transparent 85%), radial-gradient(at 0% 64%, rgba(47, 128, 237, 0.15) 0px, transparent 85%), radial-gradient(at 41% 94%, rgba(47, 128, 237, 0.1) 0px, transparent 85%), radial-gradient(at 100% 99%, rgba(47, 128, 237, 0.05) 0px, transparent 85%)",
                  }}
                />

                <CardHeader className="flex flex-col items-center justify-center text-center p-0 z-10">
                  <div className="p-3 sm:p-4 bg-primary/10 rounded-full mb-3 sm:mb-4 ring-1 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(47,128,237,0.5)]">
                    <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">{label}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">{description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          </Link>
        ))}
      </div>
    </main>
  );
}

