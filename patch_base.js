const fs = require('fs');
let content = fs.readFileSync('src/app/accounting/AccountingClient.tsx', 'utf8');

content = content.replace(
  "const [loading, setLoading] = useState(true);",
  "const [loading, setLoading] = useState(true);\n  const [refreshKey, setRefreshKey] = useState(0);"
);

content = content.replace(
  "}, [organizationId, periodFilter, activeTab]);",
  "}, [organizationId, periodFilter, activeTab, refreshKey]);"
);

const handleFn = `
  const handleSetBase = async () => {
    if (!baseInput || isNaN(Number(baseInput))) {
      toast.error('Ingrese un valor válido para la base');
      return;
    }
    
    setIsSettingBase(true);
    try {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      const localDate = now.toISOString().split('T')[0];
      await setInitialCashBase(organizationId, localDate, Number(baseInput));
      toast.success('Base de caja actualizada (Efectivo)');
      setBaseInput('');
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar base');
    } finally {
      setIsSettingBase(false);
    }
  };
`;

content = content.replace(
  "const planLimits = getPlanLimits(subscriptionPlan || 'basic');",
  handleFn + "\n  const planLimits = getPlanLimits(subscriptionPlan || 'basic');"
);

fs.writeFileSync('src/app/accounting/AccountingClient.tsx', content);
