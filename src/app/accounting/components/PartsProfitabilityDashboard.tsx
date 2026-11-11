'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {getPartsProfitability} from '@/actions/parts-profitability';
import {partsDatePreset,partCostLabel,validatePartsProfitFilters,type PartsProfitFilters,type PartsProfitReport,type PartProfitRow} from '@/lib/parts-profitability';
import {Package,TrendingUp,BarChart3,Search,RefreshCw,ArrowUpRight,ArrowDownRight,AlertCircle,ChevronLeft,ChevronRight,Info,Warehouse} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card,CardContent,CardHeader,CardTitle,CardDescription} from '@/components/ui/card';
import {Alert,AlertDescription} from '@/components/ui/alert';
import {Skeleton} from '@/components/ui/skeleton';
import Link from 'next/link';

const money=(value:number)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0,maximumFractionDigits:0}).format(value);
const number=(value:number,digits=2)=>new Intl.NumberFormat('es-CO',{maximumFractionDigits:digits}).format(value);
const inputStyle='h-9 rounded-lg border border-border bg-background px-2.5 text-sm min-w-0';

function Metric({label,value,detail,icon:Icon,tone='text-primary'}:{label:string;value:string;detail:string;icon:typeof Package;tone?:string}) {
  return <Card className="min-w-0 border-border/60 shadow-sm"><CardContent className="p-4 sm:p-5">
    <div className="flex justify-between gap-3 items-center mb-3"><span className="text-xs font-semibold text-muted-foreground">{label}</span><Icon className={'h-4 w-4 shrink-0 '+tone}/></div>
    <p className={'text-2xl sm:text-[28px] font-bold tracking-tight tabular-nums '+tone}>{value}</p>
    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{detail}</p>
  </CardContent></Card>;
}
function Ranking({title,description,rows,kind}:{title:string;description:string;rows:PartProfitRow[];kind:'units'|'profit'}) {
  const maximum=rows[0]?.[kind] || 1;
  return <Card className="min-w-0 border-border/60 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">
    {kind==='units'?<BarChart3 className="w-4 h-4 text-primary"/>:<TrendingUp className="w-4 h-4 text-emerald-600"/>}{title}</CardTitle>
    <CardDescription className="text-xs">{description}</CardDescription></CardHeader><CardContent>
    {rows.length===0?<p className="text-sm text-muted-foreground py-7 text-center">{kind==='units'?'Todavía no hay ventas de repuestos en este periodo.':'No hay repuestos con utilidad positiva y costo disponible.'}</p>:
      <ol className="space-y-3.5">{rows.map((row,index)=><li key={row.item_id}>
        <div className="flex items-start justify-between gap-3 text-sm"><div className="min-w-0 flex gap-2.5 items-baseline"><span className="text-[10px] tabular-nums text-muted-foreground">{String(index+1).padStart(2,'0')}</span>
          <div className="min-w-0"><p className="font-medium truncate" title={row.name}>{row.name}</p><p className="text-[10px] text-muted-foreground font-mono">{row.sku||'Sin SKU'}{kind==='profit'&&row.costed_units<row.units?' · Costo parcial':''}</p></div></div>
          <span className={'whitespace-nowrap font-semibold tabular-nums '+(kind==='profit'?'text-emerald-600 dark:text-emerald-400':'text-foreground')}>{kind==='units'?`${number(row.units)} unid.`:money(row.profit||0)}</span></div>
        <div className="ml-6 mt-1.5 h-1.5 bg-muted/70 rounded-full overflow-hidden"><div aria-hidden="true" className={'h-full rounded-full '+(kind==='units'?'bg-primary/75':'bg-emerald-500/75')} style={{width:`${Math.max(2,Number(row[kind]||0)/maximum*100)}%`}}/></div>
      </li>)}</ol>}
  </CardContent></Card>;
}
function CostNote({row}:{row:PartProfitRow}) {
  const label=partCostLabel(row),complete=row.units>0&&row.costed_units===row.units&&row.estimated_units===0;
  return <div className={'text-[10px] mt-1 '+(complete?'text-muted-foreground':'text-amber-700 dark:text-amber-400')}>
    {label}{row.costed_units>0&&row.costed_units<row.units?` · ${number(row.costed_units)}/${number(row.units)} unid.`:''}
  </div>;
}

export default function PartsProfitabilityDashboard({organizationId}:{organizationId:string}) {
  const [filters,setFilters]=useState<PartsProfitFilters>(()=>({...partsDatePreset('30days'),query:'',sort:'profit',includeEstimates:false,page:1}));
  const [draft,setDraft]=useState(()=>({from:filters.from,to:filters.to,query:''}));
  const [view,setView]=useState<'profit'|'rotation'>('profit');
  const [data,setData]=useState<PartsProfitReport|null>(null);
  const [error,setError]=useState('');
  const [filterError,setFilterError]=useState('');
  const [loading,setLoading]=useState(true);
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let active=true;setLoading(true);setError('');setData(null);
    getPartsProfitability(organizationId,filters).then(report=>{if(active)setData(report);}).catch((e:Error)=>{if(active)setError(e.message||'No se pudo cargar el informe.');}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[organizationId,filters,refresh]);
  const apply=(event:FormEvent)=>{
    event.preventDefault();
    try {const next=validatePartsProfitFilters({...filters,...draft,page:1});setFilterError('');setFilters(next);}catch(e:any){setFilterError(e.message);}
  };
  const preset=(value:'30days'|'month'|'year')=>{const range=partsDatePreset(value);setDraft(current=>({...current,...range}));setFilterError('');setFilters(current=>({...current,...range,page:1}));};
  const s=data?.summary;
  const coverage=s&&s.units>0?s.costed_units/s.units*100:0;
  return <section className="space-y-5 min-w-0" aria-labelledby="parts-profit-title">
    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
      <div><div className="flex items-center gap-2 mb-1"><span className="p-2 rounded-xl bg-primary/10 text-primary"><Package className="w-4 h-4"/></span>
        <h2 id="parts-profit-title" className="font-bold text-lg sm:text-xl tracking-tight">Rentabilidad de repuestos</h2></div>
        <p className="text-xs sm:text-sm text-muted-foreground">Ventas, utilidad bruta y movimiento de cada repuesto, en un solo lugar.</p></div>
      <Link href="/inventory" className="text-xs font-semibold text-primary flex items-center gap-1.5 shrink-0 self-start sm:mt-2">Gestionar inventario <ArrowUpRight className="w-3.5 h-3.5"/></Link>
    </div>
    <Card className="border-border/60 shadow-sm"><CardContent className="p-4 space-y-3">
      <div className="flex gap-2 flex-wrap items-center justify-between"><div className="flex gap-1.5 flex-wrap">
        {([['30days','Últimos 30 días'],['month','Este mes'],['year','Este año']] as const).map(([value,label])=><Button key={value} type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={()=>preset(value)}>{label}</Button>)}
      </div><label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"><input type="checkbox" className="accent-primary h-3.5 w-3.5" checked={filters.includeEstimates}
        onChange={e=>setFilters(current=>({...current,includeEstimates:e.target.checked,page:1}))}/>Incluir estimaciones históricas</label></div>
      <form onSubmit={apply} className="grid grid-cols-2 md:grid-cols-[140px_140px_minmax(180px,1fr)_auto] items-end gap-3">
        <label className="text-xs font-medium space-y-1.5 min-w-0"><span>Desde</span><Input type="date" value={draft.from} onChange={e=>setDraft(current=>({...current,from:e.target.value}))} className="h-9 w-full min-w-0" required/></label>
        <label className="text-xs font-medium space-y-1.5 min-w-0"><span>Hasta</span><Input type="date" value={draft.to} onChange={e=>setDraft(current=>({...current,to:e.target.value}))} className="h-9 w-full min-w-0" required/></label>
        <label className="text-xs font-medium space-y-1.5 min-w-0 col-span-2 md:col-span-1"><span>Buscar repuesto</span><span className="relative block"><Search className="w-3.5 h-3.5 text-muted-foreground absolute top-3 left-3"/>
          <Input value={draft.query} maxLength={100} onChange={e=>setDraft(current=>({...current,query:e.target.value}))} placeholder="Nombre, SKU o categoría" className="h-9 pl-9"/></span></label>
        <Button type="submit" className="h-9 col-span-2 md:col-span-1 gap-2" disabled={loading}><RefreshCw className={'w-3.5 h-3.5 '+(loading?'animate-spin':'')}/>Consultar</Button>
      </form>
      {filterError&&<p role="alert" className="text-xs text-destructive">{filterError}</p>}
    </CardContent></Card>
    {error?<Alert variant="destructive"><AlertCircle className="w-4 h-4"/><AlertDescription><p>{error}</p><Button variant="outline" size="sm" className="mt-3" onClick={()=>setRefresh(value=>value+1)}>Reintentar</Button></AlertDescription></Alert>:
      loading?<div aria-label="Cargando rentabilidad" role="status" className="space-y-5"><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{[0,1,2,3].map(n=><Skeleton key={n} className="h-36 rounded-xl"/>)}</div><Skeleton className="h-72 rounded-xl"/></div>:
      data&&s&&<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Metric label="Ventas netas de repuestos" value={money(s.revenue)} detail={`${number(s.units)} unidades · ${number(s.sales_count)} ventas cobradas`} icon={Package}/>
          <Metric label={filters.includeEstimates?'Utilidad bruta con estimaciones':'Utilidad bruta registrada'} value={money(s.profit)} detail={`Calculada sobre ${money(s.costed_revenue)} en ventas con costo disponible.`} icon={s.profit>=0?TrendingUp:ArrowDownRight} tone={s.profit<0?'text-red-600 dark:text-red-400':'text-emerald-600 dark:text-emerald-400'}/>
          <Metric label="Margen sobre ventas con costo" value={s.margin==null?'—':`${number(s.margin)} %`} detail={`${number(coverage,1)} % de las unidades vendidas tienen costo incluido en el cálculo.`} icon={BarChart3}/>
          <Metric label="Repuestos sin salida" value={number(s.idle_items,0)} detail="Con existencias actuales y sin ventas en este periodo." icon={Warehouse} tone="text-amber-600 dark:text-amber-400"/>
        </div>
        {(s.missing_units>0||s.estimated_units>0)&&<div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200" role="note">
          <Info className="w-4 h-4 shrink-0 mt-0.5"/><div className="space-y-1"><p className="font-semibold">Hay costos históricos por verificar</p>
          <p>{number(s.estimated_units)} unidades tienen costo estimado y {number(s.missing_units)} no tienen costo registrado. {filters.includeEstimates?'Las estimaciones están incluidas y se identifican en la tabla.':'Las estimaciones no están incluidas en la utilidad; puedes activarlas arriba.'}</p>
          <p>Las unidades sin costo quedan fuera del cálculo de utilidad. Registra los costos en Inventario para las próximas ventas.</p></div>
        </div>}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Ranking title="Los que más rotan" description="Unidades vendidas en el periodo seleccionado." rows={data.top_rotating} kind="units"/>
          <Ranking title="Los que más utilidad aportan" description="Utilidad bruta de las unidades con costo disponible." rows={data.top_profit} kind="profit"/>
        </div>
        <Card className="border-border/60 shadow-sm min-w-0"><CardHeader className="p-4 sm:p-5 border-b border-border/50 gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><CardTitle className="text-base">Detalle por repuesto</CardTitle><CardDescription className="text-xs mt-1">{data.total_items} repuestos{filters.query?` encontrados para “${filters.query}”`:''} · El stock corresponde a las existencias actuales.</CardDescription></div>
          <div className="flex items-center flex-wrap gap-2"><div className="inline-flex p-1 rounded-lg bg-muted/60" aria-label="Vista del informe">
            <button type="button" aria-pressed={view==='profit'} className={'rounded-md px-2.5 py-1.5 text-xs font-semibold '+(view==='profit'?'bg-background shadow-sm':'text-muted-foreground')} onClick={()=>setView('profit')}>Utilidad y costos</button>
            <button type="button" aria-pressed={view==='rotation'} className={'rounded-md px-2.5 py-1.5 text-xs font-semibold '+(view==='rotation'?'bg-background shadow-sm':'text-muted-foreground')} onClick={()=>setView('rotation')}>Rotación y stock</button>
          </div><label className="sr-only" htmlFor="parts-profit-sort">Ordenar repuestos</label><select id="parts-profit-sort" value={filters.sort} className={inputStyle+' max-w-full'} onChange={e=>setFilters(current=>({...current,sort:e.target.value as PartsProfitFilters['sort'],page:1}))}>
            <option value="profit">Mayor utilidad</option><option value="quantity">Mayor rotación</option><option value="revenue">Más vendidos en pesos</option><option value="margin">Mayor margen</option><option value="stock">Más existencias</option><option value="idle">Sin movimiento primero</option></select></div></div>
        </CardHeader><CardContent className="p-0">
          <div className="overflow-x-auto w-full"><table className="w-full text-sm text-left" aria-label={view==='profit'?'Utilidad por repuesto':'Rotación de repuestos'}>
            <thead className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/20"><tr>
              <th className="px-4 sm:px-5 py-3 font-semibold min-w-[200px]">Repuesto / SKU</th><th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Unid. vendidas</th>
              {view==='profit'?<><th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Venta neta</th><th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Costo vendido</th><th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Utilidad bruta</th><th className="px-4 py-3 text-right font-semibold">Margen</th><th className="px-4 py-3 font-semibold whitespace-nowrap">Base de costos</th></>:
                <><th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Stock actual</th><th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Unid. / día</th><th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Cobertura estimada</th><th className="px-4 py-3 font-semibold whitespace-nowrap">Última venta del periodo</th><th className="px-4 py-3 font-semibold">Movimiento</th></>}
            </tr></thead><tbody className="divide-y divide-border/50">
            {data.rows.length===0?<tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No se encontraron repuestos con estos filtros.</td></tr>:
              data.rows.map(row=><tr key={row.item_id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 sm:px-5 py-3.5"><p className="font-semibold">{row.name}</p><p className="text-[10px] text-muted-foreground mt-0.5"><span className="font-mono">{row.sku||'Sin SKU'}</span> · {row.category}{row.status==='inactive'?' · Inactivo':''}</p></td>
                <td className="px-4 py-3.5 text-right font-semibold tabular-nums">{number(row.units)}</td>
                {view==='profit'?<>
                  <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">{money(row.revenue)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">{row.cost_total==null?'—':money(row.cost_total)}{row.costed_units>0&&row.costed_units<row.units&&<p className="text-[10px] text-muted-foreground">{number(row.costed_units)} unid. con costo</p>}</td>
                  <td className={'px-4 py-3.5 text-right font-bold tabular-nums whitespace-nowrap '+(row.profit!=null&&row.profit<0?'text-red-600 dark:text-red-400':row.profit!=null?'text-emerald-600 dark:text-emerald-400':'text-muted-foreground')}>{row.profit==null?'—':money(row.profit)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">{row.margin==null?'—':`${number(row.margin)} %`}</td>
                  <td className="px-4 py-3.5 min-w-[150px]"><CostNote row={row}/></td>
                </>:<>
                  <td className={'px-4 py-3.5 text-right font-semibold tabular-nums '+(row.stock<=row.minimum_stock?'text-amber-600 dark:text-amber-400':'')}>{number(row.stock)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums">{number(row.daily_units)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">{row.coverage_days==null?'—':`${number(row.coverage_days,1)} días`}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">{row.last_sale_at?new Date(row.last_sale_at).toLocaleDateString('es-CO',{timeZone:'America/Bogota'}):'Sin ventas'}</td>
                  <td className="px-4 py-3.5 text-xs whitespace-nowrap">{row.stock<=0?<span className="text-red-600 dark:text-red-400">Sin existencias</span>:row.units===0?<span className="text-amber-600 dark:text-amber-400">Sin salida en el periodo</span>:row.coverage_days!=null&&row.coverage_days<=7?<span className="text-amber-600 dark:text-amber-400">Cobertura de hasta 7 días</span>:<span className="text-emerald-600 dark:text-emerald-400">Con movimiento</span>}</td>
                </>}
              </tr>)}
            </tbody></table></div>
          <div className="flex items-center justify-between gap-3 flex-wrap p-4 border-t border-border/50 text-xs text-muted-foreground"><p>Página {data.page} de {Math.max(1,data.total_pages)}</p><div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" disabled={data.page<=1} onClick={()=>setFilters(current=>({...current,page:current.page-1}))}><ChevronLeft className="w-3 h-3 mr-1"/>Anterior</Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" disabled={data.page>=data.total_pages} onClick={()=>setFilters(current=>({...current,page:current.page+1}))}>Siguiente<ChevronRight className="w-3 h-3 ml-1"/></Button>
          </div></div>
        </CardContent></Card>
        <div className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2 px-1"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5"/><p>Utilidad bruta = ventas de repuestos después de descuentos − costo de las unidades vendidas. No incluye mano de obra, gastos del taller ni nómina. La cobertura de stock se estima con el promedio de ventas del periodo. Los abonos y ventas pendientes no se incluyen.</p></div>
      </>}
  </section>;
}
