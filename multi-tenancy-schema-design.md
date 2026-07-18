# Multi-Tenancy Implementation Design for Prisma Schema

## Current Schema Analysis

The existing Prisma schema contains the following models with their relationships:

- **Customer**: Core customer information with motorcycles and sales
- **Motorcycle**: Vehicle details linked to customers, work orders, and appointments
- **Technician**: Staff information with work orders and appointments
- **InventoryItem**: Parts and supplies with sale items
- **Appointment**: Service bookings linking motorcycles and technicians
- **WorkOrder**: Repair orders with status tracking and sales
- **Sale**: Transaction records with sale items
- **SaleItem**: Line items linking sales to inventory

## Tenant Model Design

```prisma
model Tenant {
  id          String   @id @default(cuid())
  name        String   @unique
  domain      String?  @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations to tenant-scoped models
  customers     Customer[]
  motorcycles   Motorcycle[]
  technicians   Technician[]
  inventoryItems InventoryItem[]
  appointments  Appointment[]
  workOrders    WorkOrder[]
  sales         Sale[]
}
```

## Models Requiring Tenant Isolation

All business data models need tenant isolation:
- Customer
- Motorcycle
- Technician
- InventoryItem
- Appointment
- WorkOrder
- Sale
- SaleItem

## Updated Schema with Multi-Tenancy

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider        = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum InventoryCategory {
  Lubricantes
  Repuestos
  Llantas
  Accesorios
}

enum AppointmentStatus {
  Programada
  Completada
  Cancelada
}

enum WorkOrderStatus {
  Diagnosticando
  Reparado
  Entregado
}

model Tenant {
  id          String   @id @default(cuid())
  name        String   @unique
  domain      String?  @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  customers     Customer[]
  motorcycles   Motorcycle[]
  technicians   Technician[]
  inventoryItems InventoryItem[]
  appointments  Appointment[]
  workOrders    WorkOrder[]
  sales         Sale[]
}

model Customer {
  id          String       @id @default(cuid())
  tenantId    String
  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  email       String
  name        String
  phone       String?
  cedula      String?
  isFrequent  Boolean      @default(false)
  motorcycles Motorcycle[]
  sales       Sale[]

  @@unique([tenantId, email])
  @@unique([tenantId, cedula])
}

model Motorcycle {
  id           String        @id @default(cuid())
  tenantId     String
  tenant       Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  make         String
  model        String
  year         Int
  plate        String
  intakeDate   DateTime      @default(now())
  customer     Customer      @relation(fields: [customerId], references: [id])
  customerId   String
  workOrders   WorkOrder[]
  appointments Appointment[]

  @@unique([tenantId, plate])
}

model Technician {
  id          String        @id @default(cuid())
  tenantId    String
  tenant      Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name        String
  specialty   String
  avatarUrl   String?
  workOrders  WorkOrder[]
  appointments Appointment[]
}

model InventoryItem {
  id                String           @id @default(cuid())
  tenantId          String
  tenant            Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name              String
  sku               String
  quantity          Int
  price             Float
  minimumQuantity   Int
  location          String
  category          InventoryCategory
  supplier          String
  supplierPrice     Float
  saleItems         SaleItem[]

  @@unique([tenantId, sku])
}

model Appointment {
  id           String           @id @default(cuid())
  tenantId     String
  tenant       Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  motorcycle   Motorcycle       @relation(fields: [motorcycleId], references: [id])
  motorcycleId String
  technician   Technician       @relation(fields: [technicianId], references: [id])
  technicianId String
  date         DateTime
  time         String
  service      String
  status       AppointmentStatus @default(Programada)
}

model WorkOrder {
  id                String     @id @default(cuid())
  tenantId          String
  tenant            Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  workOrderNumber   String
  motorcycle        Motorcycle @relation(fields: [motorcycleId], references: [id])
  motorcycleId      String
  technician        Technician @relation(fields: [technicianId], references: [id])
  technicianId      String
  issueDescription  String
  status            WorkOrderStatus @default(Diagnosticando)
  createdDate       DateTime   @default(now())
  diagnosticandoDate DateTime? @default(now())
  reparadoDate      DateTime?
  entregadoDate     DateTime?
  completedDate     DateTime?
  sales             Sale[]

  @@unique([tenantId, workOrderNumber])
}

model Sale {
  id            String      @id @default(cuid())
  tenantId      String
  tenant        Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  saleNumber    String
  workOrder     WorkOrder?  @relation(fields: [workOrderId], references: [id])
  workOrderId   String?
  customer      Customer?   @relation(fields: [customerId], references: [id])
  customerId    String?
  customerName  String?
  date          DateTime    @default(now())
  total         Float
  saleItems     SaleItem[]

  @@unique([tenantId, saleNumber])
}

model SaleItem {
  id             String      @id @default(cuid())
  tenantId       String
  tenant         Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sale           Sale        @relation(fields: [saleId], references: [id])
  saleId         String
  inventoryItem  InventoryItem @relation(fields: [inventoryItemId], references: [id])
  inventoryItemId String
  quantity       Int
  price          Float

  @@unique([tenantId, saleId, inventoryItemId])
}
```

## Migration Strategy

1. **Create Tenant Model**: Add the new Tenant model first
2. **Add tenantId Fields**: Add tenantId fields to all existing models with default values
3. **Create Relations**: Add tenant relations to all models
4. **Update Unique Constraints**: Modify unique constraints to include tenantId
5. **Data Migration**: Assign existing data to a default tenant or migrate per tenant
6. **Remove Defaults**: Remove default values from tenantId fields after data migration

## Implementation Considerations

- **Shared Database**: Using a single PostgreSQL database with tenant_id columns for cost-effectiveness
- **Cascade Deletes**: Tenant deletion cascades to all related data
- **Unique Constraints**: Tenant-scoped uniqueness for emails, plates, SKUs, etc.
- **Query Filtering**: All queries must include tenant context
- **Data Isolation**: Row-level security ensures tenant data separation

## Next Steps

1. Review and approve this design
2. Switch to Code mode to implement the schema changes
3. Update application code to handle tenant context
4. Implement tenant-aware queries and mutations