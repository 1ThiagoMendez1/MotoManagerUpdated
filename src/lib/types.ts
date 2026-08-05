export type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  cedula?: string | null;
  isFrequent?: boolean;
};

export type Motorcycle = {
  id: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  intakeDate: string;
  customer: Customer;
  issueDescription?: string | null;
};

export type Technician = {
  id: string;
  name: string;
  specialty: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  workOrders?: WorkOrder[];
};

export type InventoryCategory = 'Lubricantes' | 'Repuestos' | 'Llantas' | 'Accesorios';

export type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  minimumQuantity: number;
  location: string;
  category: InventoryCategory;
  supplierPrice: number;
  supplier: string;
};
export type WorkOrderImage = {
  id: string;
  imageUrl: string;
  description?: string | null;
  createdAt: string;
};

export type WorkOrder = {
  id: string;
  organizationId?: string;
  workOrderNumber: string;
  motorcycle: Motorcycle;
  technician: Technician | null;
  issueDescription?: string | null;
  solutionDescription?: string | null;
  /** Monto total de abonos realizados por el cliente para esta orden */
  depositAmount?: number;
  createdDate: string;
  diagnosticandoDate?: string;
  reparadoDate?: string;
  entregadoDate?: string;
  completedDate?: string;
  status: 'Ingreso a revisión' | 'Diagnosticando' | 'Reparado' | 'Entregado' | 'Moto entregada por cotización rechazada';
  quoteStatus?: 'Pendiente' | 'Aprobada' | 'Rechazada';
  quote_status?: 'pending' | 'approved' | 'rejected' | null;
  quote_responded_at?: string | null;
  customerObservations?: string | null;
  workshop?: { name: string } | null;
  sales?: any[];
  images?: WorkOrderImage[];
};

export type SaleItem = {
  id: string;
  inventoryItemId: string;
  quantity: number;
  price: number;
  name?: string;
  sku?: string;
};

export type Sale = {
  id: string;
  saleNumber: string;
  workOrderId?: string | null;
  workOrder?: WorkOrder;
  customerId?: string | null;
  customer?: Customer;
  customerName?: string;
  workshopName?: string;
  items?: SaleItem[];
  date: string;
  total: number;
  paymentMethod?: string;
  depositAmount?: number;
  subtotal?: number;
  discountPercentage?: number;
  discountTotal?: number;
  laborCost?: number;
  status?: string;
};

export type Reminder = {
  id: string;
  serviceType: string;
  dueDate: string;
  status: 'pending' | 'sent';
  sentAt?: string | null;
  createdAt: string;
};

export type Appointment = {
  id: string;
  motorcycleId: string;
  motorcycle: Motorcycle;
  technicianId?: string | null;
  technician: Technician;
  service: string;
  date: string;
  time: string;
  status: 'Programada' | 'Confirmada' | 'En Progreso' | 'Completada' | 'Cancelada';
  notes?: string | null;
  createdAt: string;
};
