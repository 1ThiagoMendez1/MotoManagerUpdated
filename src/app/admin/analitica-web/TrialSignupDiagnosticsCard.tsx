import { AlertCircle, ShieldCheck } from 'lucide-react';
import type { TrialSignupDiagnostics } from '@/lib/analytics/web-shared';
import { TRIAL_ERROR_LABELS, type TrialErrorCode } from '@/lib/trial-signup';
import styles from './analytics.module.css';
import { TRIAL_PROGRESS_FIELDS } from '@/lib/analytics/trial-fields';

const n = (value:number) => Math.round(value).toLocaleString('es-CO');
export function TrialSignupDiagnosticsCard({ data }: { data?: TrialSignupDiagnostics }) {
  const corrections = data?.clientErrors.filter(row => row.code === 'validation') || [];
  const otherNotices = data?.clientErrors.filter(row => row.code !== 'validation') || [];
  const correction = corrections[0];
  return <section className={styles.card} aria-label="Diagnóstico de registro de prueba">
    <div className={styles.cardHeading}><div><span className={styles.eyebrow}>DEL CLIC AL TALLER</span><h2>¿En qué paso se detiene el registro?</h2><p>Medición del formulario nuevo: escribir, avanzar y enviar. Abrir la página o recibir foco no cuenta como empezar.</p></div><span className={styles.tag}>Registro · v2</span></div>
    {!data?.available ? <p className={styles.footnote}>El diagnóstico estará disponible al aplicar la actualización de datos. Las estadísticas existentes siguen disponibles.</p> : <>
      <div className={styles.twoColumns}>
        <div><div className={styles.funnel}>{[
          ['Llegaron al registro nuevo',data.visits],['Escribieron algún dato',data.started],['Avanzaron a crear el acceso',data.accessStep],['Enviaron el registro',data.submitted],
        ].map(([label,value],index) => <div key={String(label)}><span className={styles.funnelNumber}>0{index+1}</span><span>{label}</span><strong>{n(Number(value))}</strong></div>)}</div><p className={styles.footnote}>{n(data.submitAttempts)} envíos en {n(data.submitted)} navegaciones medidas. Una persona puede reintentar. Las recargas crean otra navegación y DNT/GPC no se miden.</p></div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[.04] p-5"><p className="flex items-center gap-2 text-xs font-semibold text-emerald-500"><ShieldCheck size={15}/>Talleres con prueba creada</p><strong className="mt-3 block text-3xl font-bold">{n(data.confirmedTrials)}</strong><p className={styles.footnote}>Total real del periodo, leído del registro de pruebas. Incluye todos los canales y páginas; es independiente de la medición anónima. No se calcula una conversión individual con estos totales.</p></div>
      </div>
      <div className="mt-6 border-t border-white/10 pt-5" aria-label="Avance por campo del registro">
        <h3 className="text-sm font-semibold">¿Hasta qué campo llegaron?</h3>
        <p className={styles.footnote}>Distingue ver el campo de editarlo. Cada columna cuenta navegaciones distintas con esa actividad; una recarga puede contar otra navegación. No se guarda el nombre, correo, número ni contraseña escritos.</p>
        {!data.fields?.available ? <p className={styles.footnote}>La medición por campo estará disponible al completar la actualización de datos.</p> : <>
          {!data.fields.firstMeasuredAt && <p className={styles.footnote}>Esperando actividad del formulario actualizado. Los registros anteriores no permiten reconstruir en qué campo se detuvieron.</p>}
          <div className={styles.tableScroll}><table><thead><tr><th>Campo</th><th>Vieron</th><th>Editaron</th><th>Dato válido</th><th>Aviso de corrección</th><th>Último editado sin envío</th></tr></thead><tbody>{data.fields.rows.map(field => <tr key={field.field}>
            <td>{TRIAL_PROGRESS_FIELDS.find(row => row.key === field.field)?.label || field.field}</td><td>{n(field.viewed)}</td><td>{n(field.edited)}</td><td>{n(field.valid)}</td><td>{n(field.invalid)}</td><td>{n(field.lastWithoutSubmit)}</td>
          </tr>)}</tbody></table></div>
          <p className={styles.footnote}>“Vieron” exige que al menos el 55 % del bloque del campo haya sido visible. “Dato válido” solo comprueba el formato; no verifica que el número o correo pertenezcan a esa persona. El autocompletado puede aportar un dato válido sin edición medida.</p>
          <p className={styles.footnote}>“Último editado sin envío” indica el último campo editado en navegaciones sin envío medido en el periodo. Pueden seguir abiertas o continuar después: no confirma abandono ni desconfianza. Las ediciones simultáneas no se asignan a un campo.{data.fields.ambiguousLastEdits > 0 ? ' Navegaciones con edición simultánea: '+n(data.fields.ambiguousLastEdits)+'.' : ''}{data.fields.firstMeasuredAt ? ' Primera medición por campo: '+new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'short'}).format(new Date(data.fields.firstMeasuredAt))+'.' : ''}</p>
        </>}
      </div>
      {correction && <div role="note" className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/[.04] p-4 text-xs leading-6">
        <strong>{n(correction.attempts)} {correction.attempts === 1 ? 'intento pidió' : 'intentos pidieron'} corregir datos en {n(correction.visits)} {correction.visits === 1 ? 'navegación' : 'navegaciones'}.</strong>
        <p className={styles.footnote}>Una misma persona puede pulsar continuar o enviar varias veces. Este contador registra esas validaciones; no representa personas distintas ni talleres que fallaron al crearse. El historial disponible no identifica qué campo necesitaba corrección.</p>
      </div>}
      <div className={styles.twoColumns}>
        <div>
          <ErrorCounts title="Intentos que pidieron corregir datos" rows={corrections} empty="Sin validaciones de datos registradas en el periodo."/>
          {otherNotices.length > 0 && <ErrorCounts title="Otros avisos del formulario" rows={otherNotices}/>}
        </div>
        <ErrorCounts title="Incidencias registradas por el servidor · todos los canales" rows={data.serverErrors} empty="Sin incidencias de servidor registradas en el periodo. Esto no descarta problemas antes de enviar el registro."/>
      </div>
      <p className={styles.footnote}>El embudo exige una apertura medida en el periodo. Los avisos cuentan toda la actividad recibida en ese periodo, por lo que pueden aparecer más navegaciones con avisos que llegadas medidas. Los avisos del navegador y del servidor pueden corresponder al mismo intento; no se suman entre sí. Los contadores del servidor se agrupan por día de Bogotá y no guardan identidades ni datos escritos. Los eventos anteriores a esta versión no se reinterpretan.{data.firstMeasuredAt ? ' Primer registro nuevo: '+new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'short'}).format(new Date(data.firstMeasuredAt))+'.' : ' Aún no hay actividad medida del formulario nuevo.'}</p>
    </>}
  </section>;
}
function ErrorCounts({title,rows,empty='Sin avisos registrados en el periodo.'}:{title:string;rows:{code:string;attempts:number;visits?:number}[];empty?:string}) {
  return <div className="mt-5 min-w-0"><h3 className="mb-3 flex items-start gap-2 text-xs font-semibold"><AlertCircle size={14} className="shrink-0"/>{title}</h3>{!rows.length ? <p className={styles.footnote}>{empty}</p> : <div className={styles.tableScroll}><table><thead><tr><th>Motivo</th><th>Veces registrado</th>{'visits' in rows[0] && <th>Navegaciones</th>}</tr></thead><tbody>{rows.map(row => <tr key={row.code}><td>{TRIAL_ERROR_LABELS[row.code as TrialErrorCode] || 'Otro fallo registrado'}</td><td>{n(row.attempts)}</td>{row.visits !== undefined && <td>{n(row.visits)}</td>}</tr>)}</tbody></table></div>}</div>;
}
