'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Eye, EyeOff, Wand2 } from "lucide-react";
import { createUser, updateUser } from '@/app/admin/actions';
import { useToast } from "@/hooks/use-toast";

interface UserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user?: any | null; // If provided, we are in Edit mode
}

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        phone: '',
        isSuperAdmin: false
    });

    useEffect(() => {
        if (user) {
            setFormData({
                email: user.email || '',
                password: '', // Don't pre-fill password
                name: user.name || '',
                phone: user.phone || '',
                isSuperAdmin: user.is_super_admin || false
            });
        } else {
            setFormData({
                email: '',
                password: '',
                name: '',
                phone: '',
                isSuperAdmin: false
            });
        }
        setShowPassword(false);
    }, [user, open]);

    const handleGeneratePassword = () => {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let retVal = "";
        for (let i = 0, n = charset.length; i < length; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        }
        setFormData(prev => ({ ...prev, password: retVal }));
        setShowPassword(true);
        toast({ title: "Clave generada", description: "Se ha generado una clave segura automáticamente." });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (user) {
                // Edit Mode
                await updateUser(user.id, formData);
                toast({ title: "Usuario actualizado", description: "Los datos han sido guardados correctamente." });
            } else {
                // Create Mode
                await createUser(formData);
                toast({ title: "Usuario creado", description: "El usuario ha sido registrado exitosamente." });
            }
            onOpenChange(false);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Ocurrió un error al procesar la solicitud.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-background/90 border-border/30 text-foreground backdrop-blur-xl sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{user ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        {user ? 'Modifica los datos del usuario existente.' : 'Registra un nuevo usuario en el sistema manualmente.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Nombre</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="col-span-3 bg-card/50 border-border/50"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="col-span-3 bg-card/50 border-border/50"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">Teléfono</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="col-span-3 bg-card/50 border-border/50"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">Clave</Label>
                        <div className="col-span-3 flex gap-2">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder={user ? "(Sin cambios)" : ""}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="bg-card/50 border-border/50 flex-1"
                                required={!user} // Required only for new users
                                minLength={6}
                            />
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="icon"
                                onClick={() => setShowPassword(!showPassword)}
                                className="shrink-0 border-border/50 bg-card/50 hover:bg-card"
                                title={showPassword ? "Ocultar clave" : "Mostrar clave"}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                            </Button>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="icon"
                                onClick={handleGeneratePassword}
                                className="shrink-0 border-border/50 bg-card/50 hover:bg-card"
                                title="Generar clave aleatoria"
                            >
                                <Wand2 className="h-4 w-4 text-blue-400" />
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="superuser" className="text-right text-purple-400 font-bold">Es Admin</Label>
                        <Switch
                            id="superuser"
                            checked={formData.isSuperAdmin}
                            onCheckedChange={(checked) => setFormData({ ...formData, isSuperAdmin: checked })}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {user ? 'Guardar Cambios' : 'Crear Usuario'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
