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
  Settings,
  Copy,
  Check,
  KeyRound,
  ExternalLink
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { inviteUser, getTeamMembers, updateUserRole, updateUserPermissions } from '@/lib/actions/team';
import { rolePermissions } from '@/lib/permissions';


// Real data will be fetched from DB
const initialUsers: any[] = [];


const roleLabels: Record<string, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  mechanic: 'Técnico',
  service_advisor: 'Recepcionista'
};

const roleColors: Record<string, string> = {
  owner: 'bg-primary/20 text-primary hover:bg-primary/30',
  admin: 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30',
  mechanic: 'bg-orange-500/20 text-orange-500 hover:bg-orange-500/30',
  service_advisor: 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
};

const permissionsInfo: Record<string, string> = {
  owner: 'Acceso total a reportes, finanzas y configuración.',
  admin: 'Acceso a gestión de taller y reportes básicos.',
  mechanic: 'Solo acceso a Órdenes de Trabajo e Inventario.',
  service_advisor: 'Acceso a Ventas, Clientes y Órdenes de Trabajo.'
};

const AVAILABLE_MODULES = [
  { id: '/dashboard', label: 'Dashboard Principal' },
  { id: '/work-orders', label: 'Órdenes de Trabajo' },
  { id: '/customers', label: 'Clientes' },
  { id: '/motorcycles', label: 'Motocicletas' },
  { id: '/inventory', label: 'Inventario' },
  { id: '/technicians', label: 'Técnicos' },
  { id: '/sales', label: 'Ventas y Cotizaciones' },
  { id: '/services', label: 'Servicios' },
  { id: '/appointments', label: 'Citas (Agenda)' },
  { id: '/accounting', label: 'Contabilidad' },
  { id: '/team', label: 'Usuarios y Permisos' },
  { id: '/tickets', label: 'Tickets de Soporte' },
];

export default function TeamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [successCredentials, setSuccessCredentials] = useState<{ email: string, password: string, loginUrl: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Permissions Modal state
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<any>(null);
  const [currentPermissions, setCurrentPermissions] = useState<string[]>([]);
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  React.useEffect(() => {
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve: any) => resolve({ data: [], count: 0, error: null });
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
          table: 'organization_members',
        },
        (payload: any) => {
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
            phone: formData.phone,
            role: formData.role,
            avatar: '',
            status: 'pending'
          }
        ]);
        
        setIsInviteOpen(false);
        setFormData({ name: '', email: '', phone: '', role: 'mechanic' });
        
        // Show success alert with credentials
        setSuccessCredentials({
          email: response.email || formData.email,
          password: response.tempPassword || '',
          loginUrl: response.loginUrl || window.location.origin + '/login'
        });
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

  const handleOpenPermissions = (user: any) => {
    setSelectedUserForPerms(user);
    const defaults = rolePermissions[user.role as keyof typeof rolePermissions] || [];
    setCurrentPermissions(user.customPermissions ? user.customPermissions : defaults);
    setIsPermissionsOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUserForPerms) return;
    setIsSavingPerms(true);
    
    try {
      const res = await updateUserPermissions(selectedUserForPerms.id, currentPermissions);
      if (!res.success) {
        toast({
          title: "Error al actualizar permisos",
          description: res.error || "No se pudo guardar la configuración.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Permisos actualizados",
          description: "Se han guardado los permisos del usuario correctamente.",
        });
        
        setIsPermissionsOpen(false);
        // Wait for Radix UI dialog exit animation to avoid pointer-events lock
        setTimeout(() => {
          setUsers(users.map(u => u.id === selectedUserForPerms.id ? { ...u, customPermissions: currentPermissions } : u));
          document.body.style.pointerEvents = '';
        }, 300);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al guardar los permisos.",
        variant: "destructive"
      });
    } finally {
      setIsSavingPerms(false);
    }
  };

  const handleTogglePermission = (moduleId: string) => {
    setCurrentPermissions(prev => 
      prev.includes(moduleId) 
        ? prev.filter(p => p !== moduleId)
        : [...prev, moduleId]
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">

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

          {/* Premium Success Alert Dialog */}
          <Dialog open={!!successCredentials} onOpenChange={(open) => !open && setSuccessCredentials(null)}>
            <DialogContent className="sm:max-w-[500px] border-none bg-gradient-to-br from-zinc-900 to-zinc-950 text-white shadow-2xl p-0 overflow-hidden">
              <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-3xl rounded-full" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 blur-3xl rounded-full" />
              
              <div className="p-8 relative z-10 flex flex-col items-center text-center space-y-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/30 mb-2">
                  <KeyRound className="h-8 w-8 text-white" />
                </div>
                
                <div className="space-y-2">
                  <DialogTitle className="text-2xl font-bold tracking-tight text-white">¡Usuario Creado con Éxito!</DialogTitle>
                  <DialogDescription className="text-zinc-400 text-base">
                    Las credenciales han sido enviadas por WhatsApp, pero también puedes copiarlas aquí para entregarlas manualmente.
                  </DialogDescription>
                </div>

                {successCredentials && (
                  <div className="w-full bg-black/40 border border-white/10 rounded-xl p-5 space-y-4 backdrop-blur-md">
                    <div className="space-y-1 text-left">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Usuario / Email</p>
                      <p className="font-mono text-zinc-200">{successCredentials.email}</p>
                    </div>
                    
                    <div className="space-y-2 text-left">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Contraseña Temporal</p>
                      <div className="flex items-center justify-between gap-3 bg-black/60 rounded-lg p-3 border border-white/5 group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <code className="text-2xl font-bold tracking-widest text-primary relative z-10 font-mono">
                          {successCredentials.password}
                        </code>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="relative z-10 h-9 bg-white/10 hover:bg-white/20 text-white border-none transition-all"
                          onClick={(e) => {
                            const textToCopy = successCredentials.password;
                            
                            const fallbackCopy = () => {
                              const textArea = document.createElement("textarea");
                              textArea.value = textToCopy;
                              textArea.style.position = "fixed";
                              textArea.style.opacity = "0";
                              
                              // Añadirlo dentro del contenedor actual para evitar problemas con el Focus Trap del Dialog modal
                              e.currentTarget.appendChild(textArea);
                              
                              textArea.focus();
                              textArea.select();
                              
                              try {
                                document.execCommand('copy');
                              } catch (err) {
                                console.error("Error al copiar: ", err);
                              }
                              
                              e.currentTarget.removeChild(textArea);
                            };

                            if (navigator.clipboard && navigator.clipboard.writeText) {
                              navigator.clipboard.writeText(textToCopy).catch(() => fallbackCopy());
                            } else {
                              fallbackCopy();
                            }
                            
                            setIsCopied(true);
                            toast({ title: "Código copiado", description: "La contraseña temporal ha sido copiada." });
                            setTimeout(() => setIsCopied(false), 2000);
                          }}
                        >
                          {isCopied ? (
                            <><Check className="h-4 w-4 mr-2 text-emerald-400" /> Copiado</>
                          ) : (
                            <><Copy className="h-4 w-4 mr-2" /> Copiar</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  className="w-full h-12 text-md font-semibold bg-white text-black hover:bg-zinc-200 transition-colors mt-4" 
                  onClick={() => setSuccessCredentials(null)}
                >
                  Entendido, cerrar ventana
                </Button>
              </div>
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
                            {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0,2)}
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
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onSelect={(e) => {
                                e.preventDefault();
                                setTimeout(() => handleOpenPermissions(user), 0);
                              }}
                            >
                              Personalizar Permisos
                            </DropdownMenuItem>
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

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Personalizar Permisos</DialogTitle>
            <DialogDescription>
              Selecciona a qué módulos tendrá acceso {selectedUserForPerms?.name}. Esto sobreescribirá los permisos por defecto de su rol.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {AVAILABLE_MODULES.map((module) => (
              <div key={module.id} className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm hover:bg-muted/50 transition-colors">
                <Checkbox 
                  id={module.id} 
                  checked={currentPermissions.includes(module.id) || currentPermissions.includes('*')}
                  onCheckedChange={() => handleTogglePermission(module.id)}
                  disabled={currentPermissions.includes('*')}
                />
                <div className="space-y-1 leading-none">
                  <Label htmlFor={module.id} className="font-medium cursor-pointer">
                    {module.label}
                  </Label>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsOpen(false)} disabled={isSavingPerms}>
              Cancelar
            </Button>
            <Button onClick={handleSavePermissions} disabled={isSavingPerms}>
              {isSavingPerms ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
