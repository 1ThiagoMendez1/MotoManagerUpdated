'use client';
import Link from 'next/link';
import {
  Bike,
  Users,
  FileText,
  Warehouse,
  DollarSign,
  UserPlus,
} from 'lucide-react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { AddCustomer } from '@/components/forms/AddCustomer';

const menuItems = [
  { href: "/motorcycles", icon: Bike, label: "Motocicletas", description: "Gestiona los vehículos" },
  { href: "/customers", icon: UserPlus, label: "Clientes", description: "Administra tus clientes" },
  { href: "/work-orders", icon: FileText, label: "Órdenes de Trabajo", description: "Administra las reparaciones" },
  { href: "/inventory", icon: Warehouse, label: "Inventario", description: "Controla tus repuestos" },
  { href: "/technicians", icon: Users, label: "Técnicos", description: "Administra tu equipo" },
  { href: "/sales", icon: DollarSign, label: "Ventas", description: "Revisa las transacciones" },
];

export default function Dashboard() {
  return (
    <main className="flex flex-col items-center justify-center w-full min-h-full overflow-auto" data-page="dashboard">
      <div className="text-center mb-2 px-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">Bienvenido a MotoManager</h1>
        <p className="text-base sm:text-lg md:text-xl text-white/80 mt-2">Selecciona una opción para comenzar a gestionar tu taller.</p>
      </div>
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 w-full max-w-5xl overflow-y-auto pb-20 px-4">
        {menuItems.map(({ href, icon: Icon, label, description }) => (
          <Link href={href} key={href}>
            <Card className="bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1 h-full shadow-lg hover:shadow-primary/50">
              <CardHeader className="flex flex-col items-center justify-center text-center p-6">
                <div className="p-4 bg-primary/20 rounded-full mb-4">
                  <Icon className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-semibold">{label}</CardTitle>
                <CardDescription className="text-white/70 mt-1">{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
