'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { User, MoreHorizontal, Pencil, Trash2, Key, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { UserDialog } from '@/components/admin/UserDialog';
import { deleteUser, resetUserPasswordAndNotify } from '@/app/admin/actions';
import { useToast } from "@/hooks/use-toast";
import { motion } from 'framer-motion';
import { formatExactDateTime } from '@/lib/dateUtils';

interface UsersTabProps {
    users: any[];
}

export default function UsersTab({ users }: UsersTabProps) {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWorkshop, setSelectedWorkshop] = useState<string>('all');
    const [showMotoManagerStaff, setShowMotoManagerStaff] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleDelete = async (userId: string) => {
        if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
        try {
            await deleteUser(userId);
            toast({ title: "Usuario eliminado" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const handleResetPassword = async (user: any) => {
        if (!user.phone) {
            toast({ variant: "destructive", title: "Atención", description: "El usuario no tiene un número de teléfono registrado." });
            return;
        }
        if (!confirm(`¿Estás seguro de restablecer la contraseña para ${user.name || 'este usuario'} y enviarla por WhatsApp a ${user.phone}?`)) return;
        
        try {
            toast({ title: "Enviando...", description: "Restableciendo contraseña y enviando WhatsApp..." });
            await resetUserPasswordAndNotify(user.id, user.email, user.phone, user.name);
            toast({ title: "Éxito", description: "Se ha restablecido la contraseña y enviado por WhatsApp." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const handleCreate = () => {
        setEditingUser(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (user: any) => {
        setEditingUser(user);
        setIsDialogOpen(true);
    };

    const uniqueWorkshops = Array.from(new Set(users.map(u => u.workshop_members?.[0]?.workshops?.name || 'Sin Taller')));

    const filteredUsers = users.filter((u) => {
        if (showMotoManagerStaff) {
            if (!u.is_super_admin) return false;
        } else {
            if (u.is_super_admin) return false;
        }

        const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
               u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const workshopName = u.workshop_members?.[0]?.workshops?.name || 'Sin Taller';
        const matchesWorkshop = selectedWorkshop === 'all' || workshopName === selectedWorkshop;
        
        return matchesSearch && matchesWorkshop;
    });

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-center">
                    <div className="relative group w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-purple-400 transition-colors" />
                        <Input 
                            placeholder="Buscar por nombre o email..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full sm:w-64 bg-background dark:bg-white/5 border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-purple-500/50 rounded-xl"
                        />
                    </div>
                    
                    {!showMotoManagerStaff && (
                        <Select value={selectedWorkshop} onValueChange={setSelectedWorkshop}>
                            <SelectTrigger className="w-full sm:w-48 bg-background dark:bg-white/5 border-border dark:border-white/10 text-foreground dark:text-white rounded-xl focus:ring-1 focus:ring-purple-500/50">
                                <SelectValue placeholder="Filtrar por taller" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover dark:bg-[#111827] border-border dark:border-white/10 text-foreground dark:text-white rounded-xl">
                                <SelectItem value="all" className="focus:bg-muted dark:focus:bg-white/10 focus:text-foreground dark:focus:text-white cursor-pointer rounded-lg mx-1">Todos los talleres</SelectItem>
                                {uniqueWorkshops.map((workshop) => (
                                    <SelectItem key={workshop} value={workshop} className="focus:bg-muted dark:focus:bg-white/10 focus:text-foreground dark:focus:text-white cursor-pointer rounded-lg mx-1">
                                        {workshop}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <div className="flex items-center justify-between space-x-2 bg-background dark:bg-white/5 px-3 py-2 rounded-xl border border-border dark:border-white/10 w-full sm:w-auto h-10">
                        <Label htmlFor="staff-mode" className="text-foreground dark:text-white text-sm cursor-pointer whitespace-nowrap">
                            Personal MotoManager
                        </Label>
                        <Switch
                            id="staff-mode"
                            checked={showMotoManagerStaff}
                            onCheckedChange={setShowMotoManagerStaff}
                            className="data-[state=checked]:bg-purple-600"
                        />
                    </div>
                </div>

                <Button
                    onClick={handleCreate}
                    className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] border border-white/10 rounded-xl transition-all hover:scale-105"
                >
                    <User className="mr-2 h-4 w-4" />
                    Nuevo Usuario
                </Button>
            </div>

            <UserDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                user={editingUser}
            />

            <div className="rounded-2xl border border-border dark:border-white/10 bg-card dark:bg-white/[0.02] backdrop-blur-xl overflow-hidden shadow-2xl relative">
                {/* Subtle inner glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
                
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border dark:border-white/10 hover:bg-transparent">
                                <TableHead className="text-muted-foreground font-semibold py-5 text-xs uppercase tracking-wider pl-6">Usuario</TableHead>
                                <TableHead className="text-muted-foreground font-semibold py-5 text-xs uppercase tracking-wider">Rol / Acceso</TableHead>
                                <TableHead className="text-muted-foreground font-semibold py-5 text-xs uppercase tracking-wider">Taller Asignado</TableHead>
                                <TableHead className="text-muted-foreground font-semibold py-5 text-xs uppercase tracking-wider">Fecha Registro</TableHead>
                                <TableHead className="text-right text-muted-foreground font-semibold py-5 text-xs uppercase tracking-wider pr-6">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        No se encontraron usuarios.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => {
                                    const workshopName = user.workshop_members?.[0]?.workshops?.name || 'Sin Taller';
                                    const role = user.workshop_members?.[0]?.role || 'user';

                                    let roleColor = "bg-white/10 text-white border-white/20";
                                    let RoleIcon = User;
                                    
                                    if (user.is_super_admin) {
                                        roleColor = "bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]";
                                        RoleIcon = ShieldAlert;
                                    } else if (role === 'owner' || role === 'admin') {
                                        roleColor = "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]";
                                        RoleIcon = ShieldCheck;
                                    }

                                    return (
                                        <TableRow key={user.id} className="border-border dark:border-white/5 hover:bg-muted/50 dark:hover:bg-white/[0.04] transition-all text-sm group">
                                            <TableCell className="py-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground overflow-hidden">
                                                        {user.avatar_url ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <User className="h-5 w-5" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-foreground dark:text-white font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{user.name || 'Sin Nombre'}</span>
                                                        <span className="text-xs text-muted-foreground/80">{user.email}</span>
                                                        {user.phone && (
                                                            <span className="text-[10px] text-blue-400/80 mt-0.5 font-mono">
                                                                {user.phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-4">
                                                <div className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${roleColor}`}>
                                                    <RoleIcon className="w-3 h-3 mr-1.5" />
                                                    {user.is_super_admin ? 'SUPER ADMIN' : role.toUpperCase()}
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-4">
                                                <span className={`text-sm ${workshopName === 'Sin Taller' ? 'text-muted-foreground/50 italic' : 'text-foreground/80 dark:text-white/80'}`}>
                                                    {workshopName}
                                                </span>
                                            </TableCell>

                                            <TableCell className="py-4">
                                                <span className="text-muted-foreground text-xs bg-white/5 px-2 py-1 rounded-md border border-white/5">
                                                    {formatExactDateTime(user.created_at)}
                                                </span>
                                            </TableCell>

                                            <TableCell className="text-right py-4 pr-6">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-white/10 rounded-lg">
                                                            <span className="sr-only">Abrir menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-popover dark:bg-[#111827]/95 border-border dark:border-white/10 text-foreground dark:text-white backdrop-blur-xl shadow-2xl rounded-xl">
                                                        <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wider">Acciones</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            className="hover:bg-muted dark:hover:bg-white/10 focus:bg-muted dark:focus:bg-white/10 cursor-pointer rounded-lg mx-1"
                                                            onClick={() => handleEdit(user)}
                                                        >
                                                            <Pencil className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" /> Editar Usuario
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            className="hover:bg-muted dark:hover:bg-white/10 focus:bg-muted dark:focus:bg-white/10 cursor-pointer rounded-lg mx-1"
                                                            onClick={() => handleResetPassword(user)}
                                                        >
                                                            <Key className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Reset Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-border dark:bg-white/10 my-1" />
                                                        <DropdownMenuItem
                                                            className="text-rose-400 hover:bg-rose-500/10 focus:bg-rose-500/10 focus:text-rose-300 cursor-pointer rounded-lg mx-1"
                                                            onClick={() => handleDelete(user.id)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
