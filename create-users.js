const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUsers() {
  try {
    console.log('Creating tenant...');

    // Create tenant first
    const tenant = await prisma.tenant.upsert({
      where: { domain: 'demo.motomanager.com' },
      update: {},
      create: {
        id: 'default-tenant',
        name: 'MotoManager Demo',
        domain: 'demo.motomanager.com',
        email: 'contacto@demo.com',
        phone: '+57 300 123 4567',
      },
    });

    console.log('Tenant created:', tenant);

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    console.log('Creating users...');

    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: 'admin@demo.motomanager.com',
        },
      },
      update: {},
      create: {
        id: 'admin-user',
        tenantId: tenant.id,
        email: 'admin@demo.motomanager.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
      },
    });

    console.log('Admin user created:', adminUser);

    // Create regular user
    const regularUser = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: 'user@demo.motomanager.com',
        },
      },
      update: {},
      create: {
        id: 'regular-user',
        tenantId: tenant.id,
        email: 'user@demo.motomanager.com',
        password: hashedPassword,
        name: 'Regular User',
        role: 'user',
      },
    });

    console.log('Regular user created:', regularUser);

    console.log('✅ Users created successfully!');
    console.log('Admin login: admin@demo.motomanager.com / password123');
    console.log('User login: user@demo.motomanager.com / password123');

  } catch (error) {
    console.error('Error creating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUsers();