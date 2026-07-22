'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  Shield, 
  MoreVertical,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { inviteUser, getTeamMembers, updateUserRole } from '@/lib/actions/team';


// Real data will be fetched from DB
const initialUsers: any[] = [];


const roleLabels: Record<string, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  mechanic: 'Técnico',
  receptionist: 'Recepcionista'
};

const roleColors: Record<string, string> = {
  owner: 'bg-primary/20 text-primary hover:bg-primary/30',
  admin: 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30',
  mechanic: 'bg-orange-500/20 text-orange-500 hover:bg-orange-500/30',
  receptionist: 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
};

const permissionsInfo: Record<string, string> = {
  owner: 'Acceso total a reportes, finanzas y configuración.',
  admin: 'Acceso a gestión de taller y reportes básicos.',
  mechanic: 'Solo acceso a Órdenes de Trabajo e Inventario.',
  receptionist: 'Acceso a Clientes, Citas y Órdenes de Trabajo.'
};

export default function TeamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;

    async function loadData() {
      const data = await getTeamMembers();
      setUsers(data);
      setIsLoading(false);
    }
    loadData();

    // Subscribe to realtime changes on workshop_members
    const channel = supabase
      .channel('team-roles')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workshop_members',
        },
        (payload) => {
          const { user_id, role } = payload.new;
          setUsers((currentUsers) => 
            currentUsers.map(u => u.id === user_id ? { ...u, role } : u)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'mechanic'
  });

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Optimistic update
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    
    // API call to update DB
    const res = await updateUserRole(userId, newRole);
    if (!res.success) {
      toast({
        title: "Error al cambiar rol",
        description: res.error || "No se pudo actualizar el rol del usuario.",
        variant: "destructive"
      });
      // Revert if failed by reloading data
      const data = await getTeamMembers();
      setUsers(data);
    } else {
      toast({
        title: "Rol actualizado",
        description: "El rol del usuario ha sido actualizado correctamente.",
      });
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await inviteUser({
        ...formData,
        workshopName: 'MotoManager Taller' // In a real app, this would come from tenant context
      });

      if (response.success) {
        toast({
          title: "Usuario invitado exitosamente",
          description: "Se han enviado las credenciales por WhatsApp al nuevo usuario.",
        });
        
        // Add user to local state for instant feedback
        setUsers([
          ...users,
          {
            id: Date.now().toString(),
            name: formData.name,
            email: formData.email,
            role: formData.role,
            avatar: '',
            status: 'pending'
          }
        ]);
        
        setIsInviteOpen(false);
        setFormData({ name: '', email: '', phone: '', role: 'mechanic' });
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast({
        title: "Error al invitar usuario",
        description: error.message || "No se pudo enviar la invitación",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Usuarios y Permisos</h1>
              <p className="text-muted-foreground">Gestiona quién tiene acceso a tu taller.</p>
            </div>
          </div>
          
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <UserPlus className="h-4 w-4" />
                Invitar Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleInviteSubmit}>
                <DialogHeader>
                  <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
                  <DialogDescription>
                    Agrega un nuevo miembro a tu taller. Sus credenciales de acceso serán enviadas por WhatsApp automáticamente.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input 
                      id="name" 
                      placeholder="Ej. Juan Pérez" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Correo Electrónico (Usuario)</Label>
                    <Input 
                      id="email" 
                      type="email"
                      placeholder="Ej. juan@taller.com" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Número de WhatsApp</Label>
                    <Input 
                      id="phone" 
                      type="tel"
                      placeholder="Ej. 3001234567" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Necesario para enviar las credenciales</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select 
                      value={formData.role} 
                      onValueChange={(value) => setFormData({...formData, role: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Enviando...' : 'Crear y Enviar Credenciales'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main User List */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardHeader className="pb-3 border-b border-border/50 flex flex-col gap-4 relative z-10">
                <div className="flex flex-row items-center justify-between">
                  <h2 className="text-xl font-bold">Técnicos Activos</h2>
                </div>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por nombre o email..." 
                    className="pl-9 bg-background/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {filteredUsers.map((user) => (
                    <motion.div 
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 sm:p-6 hover:bg-primary/5 transition-colors relative z-10"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground">{user.name}</h3>
                            {user.status === 'pending' && (
                              <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground">Pendiente</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge className={`${roleColors[user.role]} font-normal px-2.5 py-0.5 border-0`}>
                          {roleLabels[user.role]}
                        </Badge>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Cambiar Rol</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {Object.entries(roleLabels).map(([key, label]) => (
                              <DropdownMenuItem 
                                key={key}
                                onClick={() => handleRoleChange(user.id, key)}
                                className="flex items-center justify-between cursor-pointer"
                              >
                                {label}
                                {user.role === key && <CheckCircle2 className="h-4 w-4 text-primary" />}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer">
                              Revocar Acceso
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isLoading && (
                    <div className="p-8 text-center text-muted-foreground">
                      Cargando técnicos...
                    </div>
                  )}
                  
                  {!isLoading && filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No se encontraron usuarios que coincidan con tu búsqueda.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card className="glass-card relative overflow-hidden group sticky top-6">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  Niveles de Acceso
                </CardTitle>
                <CardDescription>
                  Cómo funcionan los permisos de cada rol dentro de tu taller.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(roleLabels).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${roleColors[key].split(' ')[0].replace('/20', '')}`} />
                      <span className="font-medium text-sm text-foreground">{label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-4">
                      {permissionsInfo[key]}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
