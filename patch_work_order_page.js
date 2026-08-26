const fs = require('fs');
const path = 'src/app/work-orders/[id]/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const searchStr = `<AddDepositForm workOrderId={workOrder.id} currentDeposit={(workOrder as any).depositAmount ?? 0} />
              </div>
            ) : (`;

const newStr = `<AddDepositForm workOrderId={workOrder.id} currentDeposit={(workOrder as any).depositAmount ?? 0} />
              </div>
            ) : (`;

// We want to add the history UNDER the AddDepositForm
const historyUI = `

          {/* HISTORIAL DE ABONOS */}
          {(workOrder as any).depositHistory && (workOrder as any).depositHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-green-500/20">
              <h4 className="text-xs font-bold uppercase text-green-700/70 dark:text-green-400/70 mb-2 flex items-center gap-2">
                Historial de Movimientos
              </h4>
              <div className="space-y-2">
                {(workOrder as any).depositHistory.map((h: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 bg-green-500/5 rounded-lg border border-green-500/10">
                    <div className="flex flex-col">
                      <span className="font-medium text-green-800 dark:text-green-300">Abono {h.method}</span>
                      <span className="text-[10px] text-green-700/60 dark:text-green-400/60">
                        {new Date(h.date).toLocaleString('es-CO')} • Recibido por: {h.received_by}
                      </span>
                    </div>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      \${Number(h.amount).toLocaleString('es-CO')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
`;

const insertPoint = `          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 shadow-inner">
            <div>
              <p className="text-sm text-green-700 dark:text-green-300/80 mb-1 font-medium">Total abonado por el cliente</p>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]">
                \${((workOrder as any).depositAmount ?? 0).toLocaleString('es-CO')}
              </p>
            </div>

            {!isCompleted ? (
              <div className="w-full md:w-auto md:min-w-[300px]">
                <AddDepositForm workOrderId={workOrder.id} currentDeposit={(workOrder as any).depositAmount ?? 0} />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400/90 bg-green-500/10 px-5 py-3 rounded-xl border border-green-500/20">
                 <CheckCircle2 className="w-5 h-5" />
                 <span className="font-medium">Orden finalizada. No se permiten abonos.</span>
              </div>
            )}
          </div>`;

if (code.includes(insertPoint)) {
    code = code.replace(insertPoint, insertPoint + historyUI);
    fs.writeFileSync(path, code);
    console.log('patched work_order page successfully');
} else {
    console.log('insertPoint not found');
}
