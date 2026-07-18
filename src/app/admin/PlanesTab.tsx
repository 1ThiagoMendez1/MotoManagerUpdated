'use client';

import { useState, useEffect } from 'react';
import { updatePlan, addFeature, updateFeature, deleteFeature } from './plansActions';
import { Pencil, Save, Plus, Trash2, X, CheckCircle2, Eye, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_PLANS = [
  { id: 'monthly', name: 'Mensual', price: 18900, amount_in_cents: 1890000, period: '/ mes', months: 1, description: 'Para empezar sin compromiso', badge: null, savings: null, gradient: 'from-primary/20 to-primary/10 dark:from-primary/40 dark:to-primary/20', border: 'border-primary/25', accent_text: 'text-primary', btn: 'from-primary to-primary/80 hover:opacity-90 text-primary-foreground shadow-primary/25' },
  { id: 'biannual', name: 'Semestral', price: 99900, amount_in_cents: 9990000, period: '/ 6 meses', months: 6, description: 'El más elegido por los talleres', badge: 'MÁS POPULAR', savings: 'Ahorra $13.500', gradient: 'from-amber-100/80 to-orange-100/60 dark:from-amber-900/40 dark:to-orange-800/20', border: 'border-amber-500/40', accent_text: 'text-amber-600 dark:text-amber-400', btn: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25' },
  { id: 'yearly', name: 'Anual', price: 199900, amount_in_cents: 19990000, period: '/ año', months: 12, description: 'El mejor valor para tu negocio', badge: 'MEJOR VALOR', savings: 'Ahorra $26.900', gradient: 'from-purple-100/80 to-purple-50/60 dark:from-purple-900/40 dark:to-purple-800/20', border: 'border-purple-500/30', accent_text: 'text-purple-600 dark:text-purple-400', btn: 'from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-purple-500/25' }
];

const DEFAULT_FEATURES = [
  { id: '1', feature_name: 'Clientes y motos ilimitados', order_index: 10, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '2', feature_name: 'Órdenes de trabajo ilimitadas', order_index: 20, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '3', feature_name: 'Control de inventario completo', order_index: 30, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '4', feature_name: 'Ventas y facturación digital', order_index: 40, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '5', feature_name: 'Reportes exportables (Excel)', order_index: 50, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '6', feature_name: 'WhatsApp automático', order_index: 60, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '7', feature_name: 'Pagos digitales con Wompi', order_index: 70, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '8', feature_name: 'Multi-técnico con roles', order_index: 80, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '9', feature_name: 'Dashboard con estadísticas', order_index: 90, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
  { id: '10', feature_name: 'Soporte por WhatsApp', order_index: 100, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true }
];

export default function PlanesTab({ plans, features }: { plans: any[], features: any[] }) {
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [isAddingFeature, setIsAddingFeature] = useState(false);
  
  // Local state for live preview
  const [localPlans, setLocalPlans] = useState<any[]>(plans.length > 0 ? plans : DEFAULT_PLANS);
  const [localFeatures, setLocalFeatures] = useState<any[]>(features.length > 0 ? features : DEFAULT_FEATURES);
  const [showPreview, setShowPreview] = useState(false);

  // Sync state when props change after a server action revalidates the path
  useEffect(() => {
    if (plans.length > 0) setLocalPlans(plans);
    if (features.length > 0) setLocalFeatures(features);
  }, [plans, features]);

  // Sort plans so they appear in correct order
  const sortedPlans = [...localPlans].sort((a, b) => a.months - b.months);
  // Sort features by order_index
  const sortedFeatures = [...localFeatures].sort((a, b) => a.order_index - b.order_index);

  function handlePlanPreviewChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, planId: string, field: string) {
    let value: any = e.target.value;
    if (field === 'price') {
      // Remover ceros a la izquierda, excepto si es solo un cero
      value = value.replace(/^0+/, '');
      if (value === '') {
        value = ''; // Permitir que quede vacío para que el usuario pueda borrar
      } else {
        value = parseInt(value, 10) || 0;
      }
    }
    
    setLocalPlans(prev => prev.map(p => p.id === planId ? { ...p, [field]: value } : p));
  }

  async function handlePlanSubmit(e: React.FormEvent<HTMLFormElement>, planId: string) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await updatePlan(planId, formData);
    if (result.success) {
      toast.success('Plan actualizado correctamente');
      setEditingPlan(null);
    } else {
      toast.error('Error al actualizar: ' + result.error);
    }
  }

  async function handleFeatureAction(action: 'add' | 'update' | 'delete', formData: FormData | null, id?: string) {
    let result;
    
    // Optimistic UI updates
    if (action === 'update' && formData && id) {
      setLocalFeatures(prev => prev.map(f => f.id === id ? {
        ...f,
        feature_name: formData.get('feature_name') as string,
        order_index: parseInt(formData.get('order_index') as string, 10) || 0,
        included_in_monthly: formData.get('included_in_monthly') === 'on',
        included_in_biannual: formData.get('included_in_biannual') === 'on',
        included_in_yearly: formData.get('included_in_yearly') === 'on',
      } : f));
      setEditingFeature(null);
    } else if (action === 'add') {
      setIsAddingFeature(false);
    } else if (action === 'delete' && id) {
      setLocalFeatures(prev => prev.filter(f => f.id !== id));
    }

    try {
      if (action === 'add' && formData) result = await addFeature(formData);
      if (action === 'update' && formData && id) result = await updateFeature(id, formData);
      if (action === 'delete' && id) result = await deleteFeature(id);
      
      if (result?.success) {
        toast.success('Guardado correctamente');
      } else {
        toast.error('Error al guardar en base de datos: ' + result?.error);
        // Si hay un error, se podría revertir el estado aquí si fuera necesario
      }
    } catch (e: any) {
      toast.error('Error de conexión: ' + e.message);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* SECCIÓN PREVIEW TOGGLE */}
      <div className="flex justify-end">
        <button 
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm border ${showPreview ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20' : 'bg-card text-foreground border-border hover:bg-muted'}`}
        >
          <Eye className="w-4 h-4" />
          {showPreview ? 'Ocultar Vista Previa' : 'Ver Vista Previa en Vivo'}
        </button>
      </div>

      {/* VISTA PREVIA EN VIVO */}
      {showPreview && (
        <div className="bg-card dark:bg-[#111623] border border-blue-500/30 dark:border-blue-500/30 rounded-2xl p-8 shadow-[0_0_30px_rgba(59,130,246,0.1)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500" />
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-8 text-center flex items-center justify-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" /> Vista Previa (Landing Page)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {sortedPlans.map(plan => (
              <div
                key={plan.id}
                className={`relative flex flex-col gap-6 rounded-2xl bg-gradient-to-br ${plan.gradient} border ${plan.border} p-7 transition-all hover:scale-[1.02] hover:shadow-2xl ${plan.badge === 'MÁS POPULAR' ? 'ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/10' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-foreground whitespace-nowrap bg-gradient-to-r ${plan.id === 'biannual' ? 'from-amber-500 to-orange-500' : plan.id === 'yearly' ? 'from-purple-600 to-purple-500' : 'from-blue-600 to-blue-500'}`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  {plan.savings && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-medium">
                      ✓ {plan.savings}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-foreground tracking-tight">${Number(plan.price).toLocaleString('es-CO')}</span>
                  </div>
                  <p className={`text-sm mt-0.5 ${plan.accent_text || 'text-primary'}`}>{plan.period}</p>
                </div>

                <ul className="space-y-2 flex-1">
                  {sortedFeatures.filter(f => f[`included_in_${plan.id}`]).slice(0, 5).map(f => (
                    <li key={f.id} className="flex items-center gap-2 text-sm text-foreground/75">
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                      {f.feature_name}
                    </li>
                  ))}
                  {sortedFeatures.filter(f => f[`included_in_${plan.id}`]).length > 5 && (
                    <li className="text-xs text-muted-foreground italic mt-2">+ otras características...</li>
                  )}
                </ul>

                <button className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${plan.btn} text-foreground font-semibold h-12 rounded-xl shadow-lg transition-all hover:scale-105 text-sm`}>
                  <CreditCard className="h-4 w-4" /> Contratar {plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN 1: EDICIÓN DE PLANES */}
      <div className="bg-card dark:bg-[#111623] border border-border dark:border-white/5 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-foreground dark:text-white mb-4">Información de los Planes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sortedPlans.map((plan) => (
            <div key={plan.id} className="p-4 rounded-xl border border-border/50 bg-muted/20 relative group">
              {editingPlan === plan.id ? (
                <form onSubmit={(e) => handlePlanSubmit(e, plan.id)} className="space-y-3 relative z-10">
                  <div>
                    <label className="text-xs text-muted-foreground">Nombre del plan</label>
                    <input name="name" value={plan.name} onChange={(e) => handlePlanPreviewChange(e, plan.id, 'name')} className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm" required />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Precio ({plan.period})</label>
                    <input type="number" name="price" value={plan.price} onChange={(e) => handlePlanPreviewChange(e, plan.id, 'price')} className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm" required />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Descripción</label>
                    <textarea name="description" value={plan.description} onChange={(e) => handlePlanPreviewChange(e, plan.id, 'description')} rows={2} className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm" required />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Etiqueta (Badge)</label>
                    <input name="badge" value={plan.badge || ''} onChange={(e) => handlePlanPreviewChange(e, plan.id, 'badge')} placeholder="Ej. MÁS POPULAR" className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Texto de ahorro</label>
                    <input name="savings" value={plan.savings || ''} onChange={(e) => handlePlanPreviewChange(e, plan.id, 'savings')} placeholder="Ej. Ahorra $13.500" className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm" />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button type="button" onClick={() => setEditingPlan(null)} className="p-2 text-muted-foreground hover:bg-muted rounded-md"><X className="w-4 h-4" /></button>
                    <button type="submit" className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"><Save className="w-4 h-4" /></button>
                  </div>
                </form>
              ) : (
                <>
                  <button onClick={() => setEditingPlan(plan.id)} className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-blue-500 bg-background/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                  <p className="text-2xl font-extrabold text-foreground">${plan.price.toLocaleString('es-CO')}</p>
                  <p className="text-sm text-muted-foreground mb-3">{plan.period}</p>
                  <p className="text-sm">{plan.description}</p>
                  <div className="mt-4 space-y-1">
                    {plan.badge && <span className="inline-block px-2 py-0.5 bg-blue-500/10 text-blue-500 text-xs rounded-full mr-2">{plan.badge}</span>}
                    {plan.savings && <span className="inline-block px-2 py-0.5 bg-green-500/10 text-green-500 text-xs rounded-full">{plan.savings}</span>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 2: COMPARATIVA DETALLADA */}
      <div className="bg-card dark:bg-[#111623] border border-border dark:border-white/5 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground dark:text-white">Tabla Comparativa de Funcionalidades</h2>
          <button onClick={() => setIsAddingFeature(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors">
            <Plus className="w-4 h-4" /> Agregar Funcionalidad
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="py-3 px-4 font-medium">Orden</th>
                <th className="py-3 px-4 font-medium">Funcionalidad</th>
                {sortedPlans.map(p => (
                  <th key={p.id} className="py-3 px-4 font-medium text-center">{p.name}</th>
                ))}
                <th className="py-3 px-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {/* Form to Add New Feature */}
              {isAddingFeature && (
                <tr className="border-b border-border/50 bg-muted/10">
                  <td colSpan={6} className="p-4">
                    <form onSubmit={(e) => { e.preventDefault(); handleFeatureAction('add', new FormData(e.currentTarget)); }} className="flex items-center gap-4">
                      <input type="number" name="order_index" defaultValue={sortedFeatures.length * 10 + 10} className="w-16 bg-background border border-border rounded-md px-2 py-1 text-sm" required />
                      <input name="feature_name" placeholder="Nombre de funcionalidad..." className="flex-1 bg-background border border-border rounded-md px-3 py-1 text-sm" required />
                      
                      <div className="flex gap-4 px-4 items-center">
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" name="included_in_monthly" defaultChecked /> M</label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" name="included_in_biannual" defaultChecked /> S</label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" name="included_in_yearly" defaultChecked /> A</label>
                      </div>
                      
                      <div className="flex gap-2">
                        <button type="submit" className="p-1.5 bg-blue-600 text-white rounded-md"><Save className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setIsAddingFeature(false)} className="p-1.5 bg-muted rounded-md"><X className="w-4 h-4" /></button>
                      </div>
                    </form>
                  </td>
                </tr>
              )}

              {/* List of Features */}
              {sortedFeatures.map((feature) => (
                <tr key={feature.id} className="border-b border-border/20 hover:bg-muted/5 transition-colors group">
                  {editingFeature === feature.id ? (
                    <td colSpan={6} className="p-4">
                      <form onSubmit={(e) => { e.preventDefault(); handleFeatureAction('update', new FormData(e.currentTarget), feature.id); }} className="flex items-center gap-4">
                        <input type="number" name="order_index" defaultValue={feature.order_index} className="w-16 bg-background border border-border rounded-md px-2 py-1 text-sm" required />
                        <input name="feature_name" defaultValue={feature.feature_name} className="flex-1 bg-background border border-border rounded-md px-3 py-1 text-sm" required />
                        
                        <div className="flex gap-4 px-4 items-center">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" name="included_in_monthly" defaultChecked={feature.included_in_monthly} /> M
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" name="included_in_biannual" defaultChecked={feature.included_in_biannual} /> S
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" name="included_in_yearly" defaultChecked={feature.included_in_yearly} /> A
                          </label>
                        </div>
                        
                        <div className="flex gap-2">
                          <button type="submit" className="p-1.5 bg-blue-600 text-white rounded-md"><Save className="w-4 h-4" /></button>
                          <button type="button" onClick={() => setEditingFeature(null)} className="p-1.5 bg-muted rounded-md"><X className="w-4 h-4" /></button>
                        </div>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-muted-foreground w-16">{feature.order_index}</td>
                      <td className="py-3 px-4">{feature.feature_name}</td>
                      <td className="py-3 px-4 text-center">
                        {feature.included_in_monthly ? <CheckCircle2 className="w-4 h-4 mx-auto text-green-400" /> : <span className="text-muted-foreground/30">-</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {feature.included_in_biannual ? <CheckCircle2 className="w-4 h-4 mx-auto text-green-400" /> : <span className="text-muted-foreground/30">-</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {feature.included_in_yearly ? <CheckCircle2 className="w-4 h-4 mx-auto text-green-400" /> : <span className="text-muted-foreground/30">-</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingFeature(feature.id)} className="p-1.5 text-muted-foreground hover:text-blue-500 bg-muted/50 rounded-md">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => { if(confirm('¿Eliminar esta funcionalidad?')) handleFeatureAction('delete', null, feature.id) }} className="p-1.5 text-muted-foreground hover:text-red-500 bg-muted/50 rounded-md">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
