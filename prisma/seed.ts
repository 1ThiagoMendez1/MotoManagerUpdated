import { PrismaClient, AppointmentStatus, WorkOrderStatus, InventoryCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding de datos...');

  // Create a default tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'cmhb1y7ka003xjwuky2m6v4wo' },
    update: {},
    create: {
      id: 'cmhb1y7ka003xjwuky2m6v4wo',
      name: 'MotoManager Demo',
      domain: 'demo.motomanager.com',
      email: 'admin@demo.motomanager.com',
      phone: '555-0000',
    },
  });

  console.log('✅ Tenant creado/actualizado:', tenant.name);

  // Solo crear usuarios si no existen (para evitar duplicados)
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@motomanager.com' }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const adminUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'admin@motomanager.com',
        password: hashedPassword,
        name: 'Administrador',
        role: 'admin',
      },
    });
    console.log('✅ Usuario administrador creado:', adminUser.email);
    console.log('🔑 Contraseña por defecto: Admin123!');
  } else {
    console.log('ℹ️ Usuario administrador ya existe');
  }

  // Crear algunos datos de ejemplo para inventario
  const existingInventory = await prisma.inventoryItem.count();
  if (existingInventory === 0) {
    const inventoryItems = await prisma.inventoryItem.createMany({
      data: [
        {
          tenantId: tenant.id,
          name: 'Aceite 20W50',
          sku: 'ACEITE-20W50',
          category: 'Lubricantes',
          location: 'Estante A1',
          supplier: 'Castrol',
          quantity: 50,
          price: 45000,
          supplierPrice: 35000,
          minimumQuantity: 10,
        },
        {
          tenantId: tenant.id,
          name: 'Filtro de Aceite',
          sku: 'FILTRO-ACEITE',
          category: 'Repuestos',
          location: 'Estante B2',
          supplier: 'Bosch',
          quantity: 25,
          price: 25000,
          supplierPrice: 18000,
          minimumQuantity: 5,
        },
        {
          tenantId: tenant.id,
          name: 'Bujía NGK',
          sku: 'BUJIA-NGK',
          category: 'Repuestos',
          location: 'Estante C3',
          supplier: 'NGK',
          quantity: 100,
          price: 15000,
          supplierPrice: 10000,
          minimumQuantity: 20,
        },
      ],
    });
    console.log('✅ Items de inventario creados:', inventoryItems.count);
  }

  console.log('🎉 Seeding completado exitosamente!');
  console.log('');
  console.log('📋 Credenciales de acceso:');
  console.log('   Email: admin@motomanager.com');
  console.log('   Password: Admin123!');
  console.log('');
  console.log('💡 Recomendación: Cambia la contraseña después del primer inicio de sesión.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });