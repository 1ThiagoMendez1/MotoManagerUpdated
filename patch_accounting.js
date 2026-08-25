const fs = require('fs');
const content = fs.readFileSync('src/app/accounting/AccountingClient.tsx', 'utf8');

const missingImports = `
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import CategorySalesDashboard from './components/CategorySalesDashboard';
import PayrollManager from './components/PayrollManager';
import DailyClosingDashboard from './components/DailyClosingDashboard';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface AccountingClientProps {
  subscriptionPlan?: string | null;
  organizationId: string;
  inventory: any[];
  purchases?: any[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
};

const supplierData = [
  { name: 'MotoPartes SA', compras: 1250000, envios: '24h', calidad: 'Alta' },
  { name: 'Repuestos Express', compras: 850000, envios: '48h', calidad: 'Media' },
  { name: 'Frenos y Llantas', compras: 2300000, envios: '24h', calidad: 'Alta' },
];
`;

const updated = content.replace(
  "import { toast } from 'sonner';\n\nexport default function",
  "import { toast } from 'sonner';\n" + missingImports + "\nexport default function"
);

fs.writeFileSync('src/app/accounting/AccountingClient.tsx', updated);
