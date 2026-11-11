import { AlertCircle, ShieldCheck } from 'lucide-react';
import type { TrialSignupDiagnostics } from '@/lib/analytics/web-shared';
import { TRIAL_ERROR_LABELS, type TrialErrorCode } from '@/lib/trial-signup';
import styles from './analytics.module.css';

const n = (value:number) => Math.round(value).toLocaleString('es-CO');
export function TrialSignupDiagnosticsCard({ data }: { data?: TrialSignupDiagnostics }) {
  return <section className={styles.card} aria-label="Diagnóstico de registro de prueba">
    <div className={styles.cardHeading}><div><span className={styles.eyebrow}>DEL CLIC AL TALLER</span><h2>¿En qué paso se detiene el registro?</h2><p>Medición del formulario nuevo: escribir, avanzar y enviar. Abrir la página o recibir foco no cuenta como empezar.</p></div><span className={styles.tag}>Registro · v2</span></div>
    {!data?.available ? <p className={styles.footnote}>El diagnóstico estará disponible al aplicar la actualización de datos. Las estadísticas existentes siguen disponibles.</p> : <>
      <div className={styles.twoColumns}>
        <div><div className={styles.funnel}>{[
          ['Llegaron al registro nuevo',data.visits],['Escribieron algún dato',data.started],['Avanzaron a crear el acceso',data.accessStep],['Enviaron el registro',data.submitted],
        ].map(([label,value],index) => <div key={String(label)}><span className={styles.funnelNumber}>0{index+1}</span><span>{label}</span><strong>{n(Number(value))}</strong></div>)}</div><p className={styles.footnote}>{n(data.submitAttempts)} envíos en {n(data.submitted)} navegaciones medidas. Una persona puede reintentar. Las recargas crean otra navegación y DNT/GPC no se miden.</p></div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[.04] p-5"><p className="flex items-center gap-2 text-xs font-semibold text-emerald-500"><ShieldCheck size={15}/>Talleres con prueba creada</p><strong className="mt-3 block text-3xl font-bold">{n(data.confirmedTrials)}</strong><p className={styles.footnote}>Total real del periodo, leído del registro de pruebas. Incluye todos los canales y páginas; es independiente de la medición anónima. No se calcula una conversión individual con estos totales.</p></div>
      </div>
      <div className={styles.twoColumns}>
        <ErrorCounts title="Errores mostrados en el formulario" rows={data.clientErrors}/>
        <ErrorCounts title="Fallos registrados por el servidor · todos los canales" rows={data.serverErrors}/>
      </div>
      <p className={styles.footnote}>Los errores del navegador y del servidor pueden corresponder al mismo intento; no se suman entre sí. Los contadores del servidor se agrupan por día de Bogotá y no guardan identidades ni datos escritos. Los eventos anteriores a esta versión no se reinterpretan.{data.firstMeasuredAt ? ' Primer registro nuevo: '+new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'short'}).format(new Date(data.firstMeasuredAt))+'.' : ' Aún no hay actividad medida del formulario nuevo.'}</p>
    </>}
  </section>;
}
function ErrorCounts({title,rows}:{title:string;rows:{code:string;attempts:number;visits?:number}[]}) {
  return <div className="mt-5 min-w-0"><h3 className="mb-3 flex items-start gap-2 text-xs font-semibold"><AlertCircle size={14} className="shrink-0"/>{title}</h3>{!rows.length ? <p className={styles.footnote}>Sin errores registrados en el periodo. La ausencia de eventos no garantiza que todos hayan terminado.</p> : <div className={styles.tableScroll}><table><thead><tr><th>Motivo</th><th>Intentos</th>{'visits' in rows[0] && <th>Navegaciones</th>}</tr></thead><tbody>{rows.map(row => <tr key={row.code}><td>{TRIAL_ERROR_LABELS[row.code as TrialErrorCode] || 'Otro fallo registrado'}</td><td>{n(row.attempts)}</td>{row.visits !== undefined && <td>{n(row.visits)}</td>}</tr>)}</tbody></table></div>}</div>;
}
