# Comprehensive Usage Guide: Multi-Tenant Motorcycle Workshop Management System

## Overview

This application is a comprehensive multi-tenant motorcycle workshop management system built with Next.js, Prisma, and PostgreSQL. It provides isolated data management for multiple workshops while offering a unified admin interface for system management.

## Architecture

### Multi-Tenant Design
- **Database Level Isolation**: Each tenant's data is automatically filtered using Prisma middleware
- **Tenant Context**: Managed through `src/lib/tenant.ts` with localStorage for client-side persistence
- **API Routes**: Tenant-specific operations are isolated by tenant ID
- **Admin Panel**: Cross-tenant management capabilities

### Key Components
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Custom auth system (login/register routes)
- **UI Components**: Shadcn/ui component library
- **State Management**: React hooks and context providers

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn package manager

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/workshop_db"
   DIRECT_URL="postgresql://username:password@localhost:5432/workshop_db"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```
4. Run database migrations: `npx prisma migrate dev`
5. Generate Prisma client: `npx prisma generate`
6. Start development server: `npm run dev`

## Admin Panel Features

### Accessing the Admin Panel
Navigate to `/admin` to access the administrative interface.

#### Main Admin Dashboard (`/admin`)
- **Workshop Management**: View all registered workshops/tenants
- **Module Permissions**: Control which features each workshop can access
- **Plan Management**: Assign different subscription plans (Basic/Premium)
- **Support Tickets**: Access to support ticket management

#### Tenant Management (`/admin/tenants`)
- **Create New Tenants**: Add new workshop organizations
- **Edit Tenant Details**: Modify tenant name and domain
- **View Statistics**: See counts of customers, motorcycles, technicians, etc.
- **Delete Tenants**: Remove tenants (with data validation)

#### Support Tickets (`/admin/tickets`)
- **Ticket Management**: View and manage support requests
- **Status Updates**: Change ticket status (Pending, In Review, Finalized)
- **Workshop Assignment**: See which workshop reported each issue

## Multi-Tenant Features

### Tenant Selection
- **Tenant Selector Page** (`/tenant-select`): Choose which organization to work with
- **Automatic Isolation**: All data operations are automatically filtered by tenant
- **Context Persistence**: Selected tenant persists across sessions

### Data Isolation
The system automatically isolates data at the database level using Prisma middleware. All queries for:
- Customers
- Motorcycles
- Technicians
- Inventory Items
- Appointments
- Work Orders
- Sales

Are automatically filtered by the current tenant ID.

## Workshop Management Features

### Dashboard
- **Overview Metrics**: Key statistics and KPIs
- **Recent Activity**: Latest work orders, appointments, and sales
- **Quick Actions**: Fast access to common operations

### Customer Management (`/customers`)
- **Add Customers**: Register new motorcycle owners
- **Search & Filter**: Find customers by name, email, or ID
- **Customer Details**: View motorcycle history and service records
- **Frequent Customer Program**: Mark and track loyal customers

### Motorcycle Management (`/motorcycles`)
- **Register Motorcycles**: Add new motorcycles to the system
- **Service History**: Track all work performed on each motorcycle
- **Customer Association**: Link motorcycles to their owners
- **Plate Number Tracking**: Unique identification per motorcycle

### Technician Management (`/technicians`)
- **Add Technicians**: Register workshop staff
- **Specialty Assignment**: Define technician specialties
- **Workload Tracking**: Monitor technician assignments
- **Performance Metrics**: Track completed work orders

### Inventory Management (`/inventory`)
- **Stock Tracking**: Monitor parts and supplies
- **Low Stock Alerts**: Automatic notifications for reordering
- **Category Management**: Organize items by type (Lubricants, Parts, Tires, etc.)
- **Supplier Information**: Track suppliers and pricing
- **Export Features**: Export inventory reports to Excel

### Appointment Scheduling
- **Schedule Appointments**: Book service appointments
- **Technician Assignment**: Assign technicians to appointments
- **Status Tracking**: Monitor appointment progress
- **Calendar Integration**: Visual appointment management

### Work Order Management (`/work-orders`)
- **Create Work Orders**: Generate repair orders from appointments
- **Status Tracking**: Monitor repair progress (Diagnostic, Repairing, Delivered)
- **Technician Assignment**: Assign work to specific technicians
- **Parts Usage**: Track inventory consumption
- **Completion Workflow**: Mark orders as completed

### Sales Management (`/sales`)
- **Direct Sales**: Sell parts and accessories
- **Work Order Integration**: Generate sales from completed repairs
- **Receipt Generation**: Print customer receipts
- **Sales Analytics**: Track revenue and performance

## API Reference

### Tenant APIs
- `GET /api/tenants` - List all tenants (admin only)
- `POST /api/tenants` - Create new tenant (admin only)
- `GET /api/tenants/[id]` - Get tenant details (admin only)
- `PUT /api/tenants/[id]` - Update tenant (admin only)
- `DELETE /api/tenants/[id]` - Delete tenant (admin only)

### Authentication APIs
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/register` - User registration

### Workshop APIs (tenant-scoped)
All workshop APIs automatically filter by current tenant:
- `/api/customers` - Customer management
- `/api/motorcycles` - Motorcycle management
- `/api/technicians` - Technician management
- `/api/inventory` - Inventory management
- `/api/appointments` - Appointment scheduling
- `/api/work-orders` - Work order management
- `/api/sales` - Sales management

## Security Features

### Data Isolation
- **Row-Level Security**: Database queries automatically filter by tenant_id
- **API Protection**: All routes validate tenant context
- **Session Management**: Secure tenant selection and persistence

### Authentication
- **User Registration/Login**: Standard auth flow
- **Session Security**: Secure session handling
- **Role-Based Access**: Admin vs. regular user permissions

## Troubleshooting

### Common Issues

#### Tenant Selection Not Working
- Clear browser localStorage: `localStorage.removeItem('tenantId')`
- Restart the application
- Check database connection

#### API Errors
- Verify tenant is selected before making requests
- Check network connectivity
- Review server logs for detailed error messages

#### Database Connection Issues
- Verify DATABASE_URL in .env file
- Ensure PostgreSQL is running
- Run `npx prisma migrate deploy` to apply migrations

#### Permission Errors
- Ensure user has appropriate role (admin for admin features)
- Check tenant selection for workshop-specific operations

## Development

### Project Structure
```
src/
├── app/                    # Next.js app router pages
│   ├── admin/             # Admin panel pages
│   ├── api/               # API routes
│   ├── [tenant]/          # Tenant-specific pages
│   └── ...                # Other pages
├── components/            # Reusable UI components
├── lib/                   # Utility functions and configurations
│   ├── prisma.ts          # Database client with tenant middleware
│   └── tenant.ts          # Tenant context management
└── ...
```

### Key Files
- `prisma/schema.prisma` - Database schema definition
- `src/lib/prisma.ts` - Prisma client with multi-tenant extensions
- `src/lib/tenant.ts` - Tenant context utilities
- `src/middleware.ts` - Next.js middleware for tenant routing

### Adding New Features
1. Define database schema in `prisma/schema.prisma`
2. Run migrations: `npx prisma migrate dev`
3. Update Prisma client: `npx prisma generate`
4. Add tenant filtering in `src/lib/prisma.ts` if needed
5. Create API routes in `src/app/api/`
6. Build UI components and pages

## Support

For technical support:
1. Check the admin tickets panel at `/admin/tickets`
2. Review application logs
3. Consult the codebase documentation
4. Contact the development team

## Version History

- **v1.0.0**: Initial multi-tenant workshop management system
- Features: Customer, motorcycle, technician, inventory, appointment, work order, and sales management
- Admin panel with tenant and ticket management
- Comprehensive data isolation and security

---

This guide covers the complete functionality of the multi-tenant motorcycle workshop management system. For specific implementation details, refer to the source code and inline documentation.