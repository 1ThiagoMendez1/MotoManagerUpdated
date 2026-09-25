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
  Trash2,
  Sliders,
  Phone,
  Mail,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/common/PageHeader';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { 
  inviteUser, 
  getTeamMembers, 
  updateUserRole, 
  updateUserPermissions,
  updateTeamMemberInfo,
  removeUserFromTeam
} from '@/lib/actions/team';
import { rolePermissions } from '@/lib/permissions';

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

export default function TeamClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [successCredentials, setSuccessCredentials] = useState<{ email: string, password: string, loginUrl: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Manage User Modal state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'mechanic'
  });
  const [currentPermissions, setCurrentPermissions] = useState<string[]>([]);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    async function loadData() {
      const data = await getTeamMembers();
      setUsers(data);
      setIsLoading(false);
    }
    loadData();
  }, []);

  // Form state for inviting new user
  const [inviteFormData, setInviteFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'mechanic'
  });

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenManageModal = (user: any) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'mechanic'
    });
    const defaults = rolePermissions[user.role as keyof typeof rolePermissions] || [];
    setCurrentPermissions(user.customPermissions ? user.customPermissions : defaults);
    setActiveTab('info');
    setIsManageModalOpen(true);
  };

  const handleSaveUserInfo = async () => {
    if (!selectedUser) return;
    setIsSavingUser(true);
    try {
      const res = await updateTeamMemberInfo(selectedUser.id, {
        name: editFormData.name,
        phone: editFormData.phone,
        email: editFormData.email
      });

      if (!res.success) {
        toast({
          title: "Error al actualizar usuario",
          description: res.error || "No se pudieron guardar los cambios de información.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Información actualizada",
          description: "Los datos del usuario han sido guardados correctamente.",
        });

        setUsers(users.map(u => u.id === selectedUser.id ? {
          ...u,
          name: editFormData.name,
          email: editFormData.email,
          phone: editFormData.phone
        } : u));
        setIsManageModalOpen(false);
      }
    } catch (error: any) {
      toast({
        title: "Error inesperado",
        description: "No se pudo actualizar la información del usuario.",
        variant: "destructive"
      });
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSaveRoleAndPermissions = async () => {
    if (!selectedUser) return;
    setIsSavingUser(true);
    try {
      // 1. Role update
      let roleUpdated = true;
      if (selectedUser.role !== editFormData.role) {
        const roleRes = await updateUserRole(selectedUser.id, editFormData.role);
        if (!roleRes.success) {
          roleUpdated = false;
          toast({
            title: "Error al actualizar rol",
            description: roleRes.error || "No se pudo actualizar el rol.",
            variant: "destructive"
          });
        }
      }

      // 2. Permissions update
      const permRes = await updateUserPermissions(selectedUser.id, currentPermissions);
      if (!permRes.success) {
        toast({
          title: "Error al actualizar permisos",
          description: permRes.error || "No se pudieron actualizar los permisos.",
          variant: "destructive"
        });
      }

      if (roleUpdated && permRes.success) {
        toast({
          title: "Rol y permisos guardados",
          description: "Se han actualizado los accesos del usuario correctamente.",
        });

        setUsers(users.map(u => u.id === selectedUser.id ? {
          ...u,
          role: editFormData.role,
          customPermissions: currentPermissions
        } : u));
        setIsManageModalOpen(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar la configuración.",
        variant: "destructive"
      });
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsDeleting(true);
    try {
      const res = await removeUserFromTeam(selectedUser.id);
      if (res.success) {
        toast({
          title: "Usuario eliminado",
          description: `Se ha revocado el acceso a ${selectedUser.name}.`,
        });
        setUsers(users.filter(u => u.id !== selectedUser.id));
        setIsDeleteDialogOpen(false);
        setIsManageModalOpen(false);
      } else {
        toast({
          title: "Error al eliminar",
          description: res.error || "No se pudo revocar el acceso del usuario.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Ocurrió un error al intentar eliminar el usuario.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await inviteUser({
        ...inviteFormData,
        workshopName: 'MotoManager Taller'
      });

      if (response.success) {
        toast({
          title: "Usuario invitado exitosamente",
          description: "Se han enviado las credenciales por WhatsApp al nuevo usuario.",
        });
        
        setUsers([
          ...users,
          {
            id: Date.now().toString(),
            name: inviteFormData.name,
            email: inviteFormData.email,
            phone: inviteFormData.phone,
            role: inviteFormData.role,
            avatar: '',
            status: 'active'
          }
        ]);
        
        setIsInviteOpen(false);
        setInviteFormData({ name: '', email: '', phone: '', role: 'mechanic' });
        
        setSuccessCredentials({
          email: response.email || inviteFormData.email,
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

  const handleTogglePermission = (moduleId: string) => {
    setCurrentPermissions(prev => 
      prev.includes(moduleId) 
        ? prev.filter(p => p !== moduleId)
        : [...prev, moduleId]
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Header Section */}
      <PageHeader
        icon={Shield}
        iconBg="bg-primary/10 text-primary"
        title="Usuarios y Permisos"
        description="Gestiona miembros del taller, roles y permisos de acceso."
        badge={
          <Badge variant="outline" className="text-xs bg-muted/40 font-mono">
            {users.length} {users.length === 1 ? 'miembro' : 'miembros'}
          </Badge>
        }
        actions={
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-3 text-xs font-semibold rounded-lg shadow-sm gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
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
                      value={inviteFormData.name}
                      onChange={(e) => setInviteFormData({...inviteFormData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Correo Electrónico (Usuario)</Label>
                    <Input 
                      id="email" 
                      type="email"
                      placeholder="Ej. juan@taller.com" 
                      value={inviteFormData.email}
                      onChange={(e) => setInviteFormData({...inviteFormData, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Número de WhatsApp</Label>
                    <Input 
                      id="phone" 
                      type="tel"
                      placeholder="Ej. 3001234567" 
                      value={inviteFormData.phone}
                      onChange={(e) => setInviteFormData({...inviteFormData, phone: e.target.value})}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Necesario para enviar las credenciales</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select 
                      value={inviteFormData.role} 
                      onValueChange={(value) => setInviteFormData({...inviteFormData, role: value})}
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
        }
      />

      {/* Credentials Success Alert */}
      <Dialog open={!!successCredentials} onOpenChange={(open) => !open && setSuccessCredentials(null)}>
        <DialogContent className="sm:max-w-[500px] border-none bg-gradient-to-br from-zinc-900 to-zinc-950 text-white shadow-2xl p-0 overflow-hidden">
          <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
          <div className="p-8 relative z-10 flex flex-col items-center text-center space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/30 mb-2">
              <KeyRound className="h-8 w-8 text-white" />
            </div>
            
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold tracking-tight text-white">¡Usuario Creado con Éxito!</DialogTitle>
              <DialogDescription className="text-zinc-400 text-base">
                Las credenciales han sido enviadas por WhatsApp, pero también puedes copiarlas aquí.
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
                    <code className="text-2xl font-bold tracking-widest text-primary font-mono">
                      {successCredentials.password}
                    </code>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(successCredentials.password);
                        }
                        setIsCopied(true);
                        toast({ title: "Copiado", description: "Contraseña copiada al portapapeles." });
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                    >
                      {isCopied ? <Check className="h-4 w-4 mr-1 text-emerald-400" /> : <Copy className="h-4 w-4 mr-1" />}
                      {isCopied ? 'Copiado' : 'Copiar'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Button 
              className="w-full h-12 font-semibold bg-white text-black hover:bg-zinc-200" 
              onClick={() => setSuccessCredentials(null)}
            >
              Entendido, cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main User List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card relative overflow-hidden group">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-col gap-4">
              <div className="flex flex-row items-center justify-between">
                <h2 className="text-xl font-bold">Técnicos y Personal Activo</h2>
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
                    
                    <div className="flex items-center gap-3">
                      <Badge className={`${roleColors[user.role]} font-normal px-2.5 py-0.5 border-0`}>
                        {roleLabels[user.role] || user.role}
                      </Badge>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => handleOpenManageModal(user)}
                        title="Gestionar Usuario"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
                
                {isLoading && (
                  <div className="p-8 text-center text-muted-foreground">
                    Cargando equipo...
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
            <CardHeader>
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
                    <div className={`w-2 h-2 rounded-full ${roleColors[key]?.split(' ')[0].replace('/20', '')}`} />
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

      {/* Main Unified User Management Modal */}
      {selectedUser && (
        <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedUser.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {selectedUser.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                Gestionar: {selectedUser.name}
              </DialogTitle>
              <DialogDescription>
                Edita la información del usuario, modifica sus roles, personaliza sus permisos o revoca su acceso al taller.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info" className="text-xs gap-1">
                  <User className="h-3.5 w-3.5" /> Información
                </TabsTrigger>
                <TabsTrigger value="roles" className="text-xs gap-1">
                  <Sliders className="h-3.5 w-3.5" /> Rol y Permisos
                </TabsTrigger>
                <TabsTrigger value="danger" className="text-xs gap-1 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: EDIT USER INFO */}
              <TabsContent value="info" className="space-y-4 py-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Nombre Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="edit-name"
                        className="pl-9"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="edit-email">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="edit-email"
                        type="email"
                        className="pl-9"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="edit-phone">Teléfono / WhatsApp</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="edit-phone"
                        type="tel"
                        className="pl-9"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsManageModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveUserInfo} disabled={isSavingUser}>
                    {isSavingUser ? 'Guardando...' : 'Guardar Información'}
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 2: ROLE AND PERMISSIONS */}
              <TabsContent value="roles" className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-role">Rol en el Taller</Label>
                    <Select 
                      value={editFormData.role}
                      onValueChange={(val) => setEditFormData({...editFormData, role: val})}
                    >
                      <SelectTrigger id="edit-role">
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {permissionsInfo[editFormData.role]}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Permisos Personalizados por Módulo</Label>
                    <p className="text-xs text-muted-foreground">
                      Selecciona los módulos específicos a los que este usuario podrá ingresar.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 border rounded-lg p-3 bg-muted/20">
                      {AVAILABLE_MODULES.map((module) => (
                        <div 
                          key={module.id} 
                          className="flex items-center space-x-2.5 p-2 rounded-md hover:bg-muted/60 transition-colors"
                        >
                          <Checkbox 
                            id={`perm-${module.id}`} 
                            checked={currentPermissions.includes(module.id) || currentPermissions.includes('*')}
                            onCheckedChange={() => handleTogglePermission(module.id)}
                            disabled={currentPermissions.includes('*')}
                          />
                          <Label htmlFor={`perm-${module.id}`} className="text-xs cursor-pointer font-normal">
                            {module.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsManageModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveRoleAndPermissions} disabled={isSavingUser}>
                    {isSavingUser ? 'Guardando...' : 'Guardar Rol y Permisos'}
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 3: DANGER ZONE / DELETE USER */}
              <TabsContent value="danger" className="space-y-4 py-4">
                <div className="p-4 border border-destructive/30 bg-destructive/10 rounded-lg space-y-3">
                  <h4 className="font-semibold text-destructive flex items-center gap-2 text-sm">
                    <Trash2 className="h-4 w-4" /> Revocar Acceso y Eliminar Usuario
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Al revocar el acceso, el usuario <strong>{selectedUser.name}</strong> perderá de forma permanente sus permisos de ingreso al taller y no podrá consultar órdenes ni datos.
                  </p>
                  <Button 
                    variant="destructive"
                    className="w-full sm:w-auto text-xs"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Revocar Acceso del Taller
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> ¿Revocar acceso a {selectedUser?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la asociación del usuario con tu taller. No podrá ingresar de nuevo a menos que sea invitado nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Sí, Revocar Acceso'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
