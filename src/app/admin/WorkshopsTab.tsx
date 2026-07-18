'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, User, Search, Filter, Phone, ChevronDown, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import WorkshopActions from './WorkshopActions';
import { motion } from 'framer-motion';

interface WorkshopsTabProps {
    workshops: any[];
}

export default function WorkshopsTab({ workshops }: WorkshopsTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredWorkshops = workshops.filter((w) => {
        const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              w.slug.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || w.subscription_status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-400 transition-colors" />
                        <Input 
                            placeholder="Buscar taller o dominio..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full sm:w-64 bg-background dark:bg-white/5 border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-blue-500/50 rounded-xl"
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-background dark:bg-white/5 border border-border dark:border-white/10 text-foreground dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none min-w-[120px]"
                        >
                            <option value="all" className="bg-background dark:bg-[#0B0F19] text-foreground dark:text-white">Todos los estados</option>
                            <option value="active" className="bg-background dark:bg-[#0B0F19] text-foreground dark:text-white">Activos</option>
                            <option value="trialing" className="bg-background dark:bg-[#0B0F19] text-foreground dark:text-white">En Trial</option>
                            <option value="past_due" className="bg-background dark:bg-[#0B0F19] text-foreground dark:text-white">Vencidos (Past Due)</option>
                        </select>
                        <Button variant="outline" className="bg-background dark:bg-white/5 border-border dark:border-white/10 hover:bg-muted dark:hover:bg-white/10 text-foreground dark:text-white rounded-xl">
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <Link href="/register-workshop" className="w-full md:w-auto">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-white/10 rounded-xl transition-all hover:scale-105">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuevo Taller
                    </Button>
                </Link>
            </div>

            <div className="rounded-2xl border border-border dark:border-white/10 bg-card dark:bg-white/[0.02] backdrop-blur-xl overflow-hidden shadow-2xl relative">
                {/* Subtle inner glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
                
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border dark:border-white/10 hover:bg-transparent">
                                <TableHead className="text-muted-foreground font-semibold py-5 text-xs uppercase tracking-wider">Taller</TableHead>
                                <TableHead className="text-muted-foreground font-semibold py-5 text-xs uppercase tracking-wider">Estado</TableHead>
                                <TableHead className="text-muted-foreground font-semibold py-5 text-xs uppercase tracking-wider">Plan</TableHead>
                                <TableHead className="text-muted-foreground font-semibold py-5 text-xs uppercase tracking-wider">Propietario / Usuarios</TableHead>
                                <TableHead className="text-muted-foreground font-semibold py-5 text-xs uppercase tracking-wider">Registro / Cobro</TableHead>
                                <TableHead className="text-right text-muted-foreground font-semibold py-5 text-xs uppercase tracking-wider pr-6">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredWorkshops.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        No se encontraron talleres con los filtros actuales.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredWorkshops.map((workshop) => {
                                    const owner = workshop.members?.find((m: any) => m.role === 'owner')?.profile;
                                    
                                    // Status Badge styling
                                    let statusColor = "bg-white/10 text-white border-white/20";
                                    let statusDot = "bg-white";
                                    if (workshop.subscription_status === 'active') {
                                        statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]";
                                        statusDot = "bg-emerald-400";
                                    } else if (workshop.subscription_status === 'past_due' || workshop.subscription_status === 'unpaid') {
                                        statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(225,29,72,0.15)]";
                                        statusDot = "bg-rose-400";
                                    } else if (workshop.subscription_status === 'trialing') {
                                        statusColor = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]";
                                        statusDot = "bg-cyan-400";
                                    }

                                    return (
                                        <TableRow key={workshop.id} className="border-border dark:border-white/5 hover:bg-muted/50 dark:hover:bg-white/[0.04] transition-all text-sm group">
                                            <TableCell className="py-4 pl-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base">
                                                        {workshop.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-mono mt-0.5">
                                                        {workshop.slug}.motomanager.app
                                                    </span>
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-4">
                                                <div className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${statusColor}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${statusDot} ${workshop.subscription_status === 'active' ? 'animate-pulse' : ''}`} />
                                                    {workshop.subscription_status.toUpperCase()}
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-4">
                                                <div className="inline-flex items-center px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                                                    {workshop.subscription_plan === 'monthly' ? 'MENSUAL' :
                                                        workshop.subscription_plan === 'biannual' ? 'SEMESTRAL' :
                                                            workshop.subscription_plan === 'yearly' ? 'ANUAL' :
                                                                workshop.subscription_plan.toUpperCase()}
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-4">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <div className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 -ml-2 rounded-xl transition-all group/owner">
                                                            <div className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground overflow-hidden">
                                                                {owner?.avatar_url ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img src={owner.avatar_url} alt="" className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <User className="h-4 w-4" />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col text-left">
                                                                <span className="text-foreground dark:text-white font-medium text-sm flex items-center gap-1">
                                                                    {owner?.name || 'Sin Asignar'} <ChevronDown className="w-3 h-3 opacity-40 group-hover/owner:opacity-100 transition-opacity" />
                                                                </span>
                                                                <span className="text-xs text-muted-foreground/60">{owner?.email}</span>
                                                                {owner?.phone && (
                                                                    <span className="text-[11px] text-blue-400/80 mt-0.5 flex items-center gap-1">
                                                                        <Phone className="w-3 h-3" /> {owner.phone}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="w-72 bg-popover dark:bg-[#111623] border-border dark:border-white/10 shadow-2xl" align="start">
                                                        <DropdownMenuLabel className="text-foreground dark:text-white flex items-center gap-2 py-2">
                                                            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Usuarios del Taller ({workshop.members?.length || 0})
                                                        </DropdownMenuLabel>
                                                        <DropdownMenuSeparator className="bg-border dark:bg-white/10" />
                                                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                                            {workshop.members?.map((member: any) => (
                                                                <DropdownMenuItem key={member.user_id} className="focus:bg-muted dark:focus:bg-white/5 hover:bg-muted dark:hover:bg-white/5 cursor-default flex flex-col items-start py-2.5 px-3">
                                                                    <div className="flex justify-between w-full items-center mb-1">
                                                                        <span className="text-foreground dark:text-white font-medium text-sm">{member.profile?.name || 'Usuario sin nombre'}</span>
                                                                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                                            {member.role === 'owner' ? 'Propietario' : member.role === 'admin' ? 'Admin' : member.role === 'technician' ? 'Técnico' : member.role}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs text-muted-foreground">{member.profile?.email}</span>
                                                                    {member.profile?.phone && (
                                                                        <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                                                                            <Phone className="w-3 h-3" /> {member.profile.phone}
                                                                        </span>
                                                                    )}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </div>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>

                                            <TableCell className="text-muted-foreground py-4 text-xs">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex justify-between items-center w-36">
                                                        <span className="opacity-60">Inicio:</span>
                                                        <span className="text-foreground/80 dark:text-white/80">{new Date(workshop.created_at).toLocaleDateString('es-CO')}</span>
                                                    </div>
                                                    {workshop.subscription_end_date && (
                                                        <div className="flex justify-between items-center w-36">
                                                            <span className="opacity-60">Próx. Cobro:</span>
                                                            <span className="text-blue-400 font-medium">
                                                                {new Date(workshop.subscription_end_date).toLocaleDateString('es-CO')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right py-4 pr-6">
                                                <WorkshopActions workshop={workshop} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </motion.div>
    );
}
