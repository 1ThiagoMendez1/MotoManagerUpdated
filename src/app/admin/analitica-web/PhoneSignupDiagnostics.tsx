import type { PhoneSignupDiagnostics as Diagnostics } from '@/lib/analytics/web-shared';
import styles from './analytics.module.css';
const n = (value: number = 0) => value.toLocaleString('es-CO');
export function PhoneSignupDiagnostics({ data }: { data?: Diagnostics }) {
  if (!data?.available) return null;
  return <section className={styles.card} aria-label="Registro por WhatsApp">
    <div className={styles.cardHeading}><div><span className={styles.eyebrow}>REGISTRO CON WHATSAPP</span><h2>Del número a la primera orden</h2><p>Formulario sin correo ni contraseña. Esta versión se mide por separado del registro anterior.</p></div><span className={styles.tag}>Registro · v3</span></div>
    <div className={styles.twoColumns}>
      <div><h3 className="mb-3 text-sm font-semibold">Navegaciones del formulario · filtros seleccionados</h3><div className={styles.funnel}>{[
        ['Abrieron el registro',data.visits],['Escribieron un dato',data.started],['Pidieron código',data.requested],['Enviaron el código',data.verify],
      ].map(([label,value]) => <div key={String(label)}><span>{label}</span><strong>{n(Number(value))}</strong></div>)}</div><p className={styles.footnote}>Navegaciones distintas, no personas. Las recargas pueden contar de nuevo; DNT/GPC no se miden. Abrir, ver un campo o recibir foco no equivale a editarlo.</p></div>
      <div><h3 className="mb-3 text-sm font-semibold">Confirmaciones del servidor · todos los canales</h3><div className={styles.funnel}>{[
        ['Solicitudes admitidas',data.service.requested],['Envíos aceptados por Meta',data.service.accepted],['Entregas confirmadas por webhook',data.service.delivered],
        ['Fallos de envío o entrega confirmados',data.service.failed],['Códigos verificados',data.service.verified],['Pruebas creadas',data.service.created],['Talleres que crearon su primera orden',data.service.first_order],
      ].map(([label,value]) => <div key={String(label)}><span>{label}</span><strong>{n(Number(value) || 0)}</strong></div>)}</div><p className={styles.footnote}>Un envío aceptado no confirma entrega. Si no recibimos un webhook, la entrega queda sin confirmar; verificar el código confirma que la persona lo obtuvo. Cada fase se cuenta una vez por solicitud, en la fecha en que ocurre. Los reenvíos son solicitudes nuevas; no representan personas distintas. La primera orden se cuenta una vez por taller. No se calcula una conversión dividiendo estas columnas por las navegaciones anónimas.</p></div>
    </div>
    <h3 className="mt-5 text-sm font-semibold">Campos del registro nuevo</h3><div className={styles.tableScroll}><table><thead><tr><th>Campo</th><th>Vieron</th><th>Editaron</th><th>Formato válido</th><th>Pidió corrección</th></tr></thead><tbody>{data.fields.map(field => <tr key={field.field}><td>{{workshop:'Nombre del taller',phone:'WhatsApp',code:'Código de acceso'}[field.field]}</td><td>{n(field.viewed)}</td><td>{n(field.edited)}</td><td>{n(field.valid)}</td><td>{n(field.invalid)}</td></tr>)}</tbody></table></div>
    <p className={styles.footnote}>No se guardan los nombres, teléfonos ni códigos escritos en la analítica. Ver exige que al menos el 55 % del campo sea visible. Estas cifras por sí solas no demuestran abandono ni su motivo.{!data.firstMeasuredAt && ' Esperando la primera navegación del formulario nuevo.'}</p>
  </section>;
}
