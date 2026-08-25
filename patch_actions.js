const fs = require('fs');
let content = fs.readFileSync('src/actions/accounting.ts', 'utf8');

// 1. Update setInitialCashBase to use insert
content = content.replace(
  /export async function setInitialCashBase\([\s\S]*?return data;\n}/,
  `export async function setInitialCashBase(organizationId: string, date: string, amount: number, description: string = 'Apertura', type: string = 'addition') {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabaseAdmin
    .from('cash_bases')
    .insert({ organization_id: organizationId, date, amount, description, type })
    .select()
    .single();

  if (error) {
    console.error('Error setting cash base:', error);
    throw new Error('No se pudo guardar el registro de la base.');
  }

  revalidatePath('/accounting');
  return data;
}`
);

// 2. Update getRealtimeFinancialDataRaw to fetch description and type
content = content.replace(
  /\.select\('id, amount, date'\)\s*\.eq\('organization_id', organizationId\)/,
  `.select('id, amount, date, description, type')
      .eq('organization_id', organizationId)`
);

// 3. Update DailyClosingSummary interface
content = content.replace(
  /detailedExpenses: \{ id: string; category: string; description: string; amount: number \}\[\];\n\}/,
  `detailedExpenses: { id: string; category: string; description: string; amount: number }[];
  cashBases: { id: string; amount: number; description: string; type: string }[];
  totalCashBase: number;
}`
);

// 4. Update getDailyClosingSummary to fetch cash_bases
const fetchCashBases = `
  // Fetch cash bases
  const { data: basesData } = await supabaseAdmin
    .from('cash_bases')
    .select('id, amount, description, type')
    .eq('organization_id', organizationId)
    .gte('date', startIso)
    .lte('date', endIso);
    
  const cashBases = (basesData || []).map((b: any) => ({
    id: b.id,
    amount: Number(b.amount),
    description: b.description || 'Base',
    type: b.type || 'addition'
  }));
  const totalCashBase = cashBases.reduce((acc, curr) => acc + curr.amount, 0);

  return {
    totalIncome,
    totalExpenses,
    incomeByCategory,
    incomeByPaymentMethod,
    expensesByCategory,
    technicianSummary,
    pendingOrdersCount,
    detailedExpenses,
    cashBases,
    totalCashBase
  };
`;

content = content.replace(
  /return \{\n\s*totalIncome,[\s\S]*?detailedExpenses\n\s*\};\n\}/,
  fetchCashBases + '\n}'
);

fs.writeFileSync('src/actions/accounting.ts', content);
