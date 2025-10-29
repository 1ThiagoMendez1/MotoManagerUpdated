import { PrismaClient, AppointmentStatus, WorkOrderStatus, InventoryCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create a default tenant
  const tenant = await prisma.tenant.create({
    data: {
      id: 'default-tenant',
      name: 'MotoManager Demo',
      domain: 'demo.motomanager.com',
      email: 'admin@demo.motomanager.com',
      phone: '555-0000',
    },
  });

  // Seed Users
  const hashedPassword = await bcrypt.hash('password123', 10);
  const users = await prisma.user.createMany({
    data: [
      {
        id: '1',
        tenantId: tenant.id,
        email: 'admin@demo.motomanager.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
      },
      {
        id: '2',
        tenantId: tenant.id,
        email: 'user@demo.motomanager.com',
        password: hashedPassword,
        name: 'Regular User',
        role: 'user',
      },
    ],
  });

  console.log('Seeding completed - Users created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });