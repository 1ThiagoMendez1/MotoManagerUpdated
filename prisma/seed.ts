import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed for single-tenant system...');

  // Create a default admin user
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@workshop.com' }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@workshop.com',
        password: hashedPassword,
        name: 'Administrator',
        role: 'admin',
      },
    });
    console.log('✅ Admin user created:', adminUser.email);
  } else {
    console.log('ℹ️ Admin user already exists');
  }

  // Create some sample inventory items
  const existingInventory = await prisma.inventoryItem.count();
  if (existingInventory === 0) {
    const inventoryItems = await prisma.inventoryItem.createMany({
      data: [
        {
          name: 'Aceite de Motor 10W-30',
          sku: 'OIL-001',
          quantity: 50,
          price: 45000,
          minimumQuantity: 10,
          location: 'Estante A1',
          category: 'Lubricantes',
          supplier: 'Petrobras',
          supplierPrice: 35000,
        },
        {
          name: 'Filtro de Aceite',
          sku: 'FILTER-001',
          quantity: 30,
          price: 25000,
          minimumQuantity: 5,
          location: 'Estante A2',
          category: 'Repuestos',
          supplier: 'Bosch',
          supplierPrice: 18000,
        },
        {
          name: 'Pastillas de Freno Delanteras',
          sku: 'BRAKE-001',
          quantity: 20,
          price: 120000,
          minimumQuantity: 3,
          location: 'Estante B1',
          category: 'Repuestos',
          supplier: 'Ferodo',
          supplierPrice: 90000,
        },
      ],
    });
    console.log('✅ Created inventory items:', inventoryItems.count);
  }

  console.log('✅ Seed completed successfully!');
  console.log('🔐 Admin credentials:');
  console.log('   Email: admin@workshop.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });