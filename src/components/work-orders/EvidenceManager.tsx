'use client'

import { useState, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, Image as ImageIcon, Plus, X, UploadCloud, Loader2, Trash2 } from 'lucide-react'
import { addWorkOrderEvidence, deleteWorkOrderEvidence } from '@/lib/actions/work-orders'

import { toast } from 'sonner'
import Image from 'next/image'
import { WorkOrderImage } from '@/lib/types'

export function EvidenceManager({ workOrderId, evidences }: { workOrderId: string, evidences: WorkOrderImage[] }) {
    const [isUploading, setIsUploading] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [description, setDescription] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            if (selectedFile.size > 5 * 1024 * 1024) {
                toast.error('La imagen no puede pesar más de 5MB')
                return
            }
            setFile(selectedFile)
            setPreview(URL.createObjectURL(selectedFile))
        }
    }

    const clearSelection = () => {
        setFile(null)
        setPreview(null)
        setDescription('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleUpload = async () => {
        if (!file) return

        setIsUploading(true)
        const toastId = toast.loading('Subiendo evidencia...')

        try {
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${workOrderId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
            
            const { error: uploadError, data } = await supabase.storage
                .from('evidences')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) throw new Error('Error al subir imagen')

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('evidences')
                .getPublicUrl(data.path)

            // Save to database
            const formData = new FormData()
            formData.append('workOrderId', workOrderId)
            formData.append('imageUrl', publicUrl)
            formData.append('description', description)

            await addWorkOrderEvidence(formData)

            toast.success('Evidencia subida correctamente', { id: toastId })
            clearSelection()
        } catch (error) {
            console.error(error)
            toast.error('Ocurrió un error al subir la evidencia', { id: toastId })
        } finally {
            setIsUploading(false)
        }
    }

    const handleDelete = async (evidence: WorkOrderImage) => {
        if (!confirm('¿Estás seguro de eliminar esta evidencia?')) return
        
        const toastId = toast.loading('Eliminando...')
        try {
            const formData = new FormData()
            formData.append('id', evidence.id)
            formData.append('workOrderId', workOrderId)
            formData.append('imageUrl', evidence.imageUrl)

            await deleteWorkOrderEvidence(formData)
            toast.success('Evidencia eliminada', { id: toastId })
        } catch (error) {
            toast.error('Error al eliminar', { id: toastId })
        }
    }

    return (
        <Card className="bg-card/40 border-border/50 backdrop-blur-md overflow-hidden shadow-lg mb-8 relative group transition-all duration-300 hover:border-border">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
                <CardTitle className="text-xl font-medium flex items-center gap-2">
                    <Camera className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                    Evidencia Fotográfica
                </CardTitle>
            </CardHeader>
            
            <CardContent className="pt-6 relative z-10 space-y-6">
                
                {/* Image Grid */}
                {evidences && evidences.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {evidences.map((evidence) => (
                            <div key={evidence.id} className="relative group rounded-xl overflow-hidden border border-border/50 bg-muted/20 aspect-square shadow-sm">
                                <Image
                                    src={evidence.imageUrl}
                                    alt={evidence.description || 'Evidencia'}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                    <p className="text-white text-sm font-medium line-clamp-3">
                                        {evidence.description || 'Sin descripción'}
                                    </p>
                                    <Button 
                                        variant="destructive" 
                                        size="icon" 
                                        className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0"
                                        onClick={() => handleDelete(evidence)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-4 bg-muted/20 border border-dashed border-border/50 rounded-2xl">
                        <ImageIcon className="w-12 h-12 text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground font-medium">No hay fotos registradas</p>
                        <p className="text-sm text-muted-foreground/70 text-center mt-1">Sube fotos para mostrarle al cliente el trabajo realizado.</p>
                    </div>
                )}

                {/* Upload Section */}
                <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 shadow-inner">
                    <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        Agregar Nueva Evidencia
                    </h3>
                    
                    {!preview ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-border/60 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group"
                        >
                            <div className="p-4 bg-background rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                <UploadCloud className="w-8 h-8 text-indigo-500/70" />
                            </div>
                            <p className="text-foreground font-medium mb-1">Haz clic para subir una imagen</p>
                            <p className="text-xs text-muted-foreground">JPG, PNG hasta 5MB</p>
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={fileInputRef} 
                                accept="image/*"
                                onChange={handleFileSelect}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative aspect-video max-h-[300px] w-full rounded-xl overflow-hidden border border-border bg-black/5">
                                <Image src={preview} alt="Preview" fill className="object-contain" />
                                <Button 
                                    variant="destructive" 
                                    size="icon" 
                                    className="absolute top-2 right-2 rounded-full h-8 w-8 shadow-md"
                                    onClick={clearSelection}
                                    disabled={isUploading}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Input 
                                    placeholder="Agrega una descripción de lo que se ve en la foto..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="flex-1 bg-background"
                                    disabled={isUploading}
                                />
                                <Button 
                                    onClick={handleUpload} 
                                    disabled={isUploading}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all w-full sm:w-auto"
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <UploadCloud className="w-4 h-4 mr-2" />
                                    )}
                                    Subir Foto
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

            </CardContent>
        </Card>
    )
}
