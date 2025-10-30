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
};

export type Technician = {
  id: string;
  name: string;
  specialty: string;
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

export type Appointment = {
  id: string;
  motorcycle: Motorcycle;
  technician: Technician;
  date: string;
  time: string;
  service: string;
  status: 'Programada' | 'Completada' | 'Cancelada';
};

export type WorkOrder = {
  id: string;
  workOrderNumber: string;
  motorcycle: Motorcycle;
  technician: Technician;
  issueDescription: string;
  createdDate: string;
  diagnosticandoDate?: string;
  reparadoDate?: string;
  entregadoDate?: string;
  completedDate?: string;
  status: 'Diagnosticando' | 'Reparado' | 'Entregado';
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
  items?: SaleItem[];
  date: string;
  total: number;
  paymentMethod?: string;
};
