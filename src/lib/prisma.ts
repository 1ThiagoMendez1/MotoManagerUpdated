import { PrismaClient } from '@prisma/client';
import { getTenantId } from './tenant';

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient().$extends({
  query: {
    customer: {
      $allOperations: ({ operation, args, query }) => {
        const tenantId = getTenantId();
        if (tenantId) {
          if (operation === 'findUnique' || operation === 'findFirst') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'findMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args.data, tenantId };
          } else if (operation === 'update' || operation === 'updateMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'delete' || operation === 'deleteMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'upsert') {
            args.where = { ...args.where, tenantId };
            args.create = { ...args.create, tenantId };
            args.update = { ...args.update, tenantId };
          }
        }
        return query(args);
      },
    },
    motorcycle: {
      $allOperations: ({ operation, args, query }) => {
        const tenantId = getTenantId();
        if (tenantId) {
          if (operation === 'findUnique' || operation === 'findFirst') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'findMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args.data, tenantId };
          } else if (operation === 'update' || operation === 'updateMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'delete' || operation === 'deleteMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'upsert') {
            args.where = { ...args.where, tenantId };
            args.create = { ...args.create, tenantId };
            args.update = { ...args.update, tenantId };
          }
        }
        return query(args);
      },
    },
    technician: {
      $allOperations: ({ operation, args, query }) => {
        const tenantId = getTenantId();
        if (tenantId) {
          if (operation === 'findUnique' || operation === 'findFirst') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'findMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args.data, tenantId };
          } else if (operation === 'update' || operation === 'updateMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'delete' || operation === 'deleteMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'upsert') {
            args.where = { ...args.where, tenantId };
            args.create = { ...args.create, tenantId };
            args.update = { ...args.update, tenantId };
          }
        }
        return query(args);
      },
    },
    inventoryItem: {
      $allOperations: ({ operation, args, query }) => {
        const tenantId = getTenantId();
        if (tenantId) {
          if (operation === 'findUnique' || operation === 'findFirst') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'findMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args.data, tenantId };
          } else if (operation === 'update' || operation === 'updateMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'delete' || operation === 'deleteMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'upsert') {
            args.where = { ...args.where, tenantId };
            args.create = { ...args.create, tenantId };
            args.update = { ...args.update, tenantId };
          }
        }
        return query(args);
      },
    },
    appointment: {
      $allOperations: ({ operation, args, query }) => {
        const tenantId = getTenantId();
        if (tenantId) {
          if (operation === 'findUnique' || operation === 'findFirst') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'findMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args.data, tenantId };
          } else if (operation === 'update' || operation === 'updateMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'delete' || operation === 'deleteMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'upsert') {
            args.where = { ...args.where, tenantId };
            args.create = { ...args.create, tenantId };
            args.update = { ...args.update, tenantId };
          }
        }
        return query(args);
      },
    },
    workOrder: {
      $allOperations: ({ operation, args, query }) => {
        const tenantId = getTenantId();
        if (tenantId) {
          if (operation === 'findUnique' || operation === 'findFirst') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'findMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args.data, tenantId };
          } else if (operation === 'update' || operation === 'updateMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'delete' || operation === 'deleteMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'upsert') {
            args.where = { ...args.where, tenantId };
            args.create = { ...args.create, tenantId };
            args.update = { ...args.update, tenantId };
          }
        }
        return query(args);
      },
    },
    sale: {
      $allOperations: ({ operation, args, query }) => {
        const tenantId = getTenantId();
        if (tenantId) {
          if (operation === 'findUnique' || operation === 'findFirst') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'findMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args.data, tenantId };
          } else if (operation === 'update' || operation === 'updateMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'delete' || operation === 'deleteMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'upsert') {
            args.where = { ...args.where, tenantId };
            args.create = { ...args.create, tenantId };
            args.update = { ...args.update, tenantId };
          }
        }
        return query(args);
      },
    },
    saleItem: {
      $allOperations: ({ operation, args, query }) => {
        const tenantId = getTenantId();
        if (tenantId) {
          if (operation === 'findUnique' || operation === 'findFirst') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'findMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args.data, tenantId };
          } else if (operation === 'update' || operation === 'updateMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'delete' || operation === 'deleteMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'upsert') {
            args.where = { ...args.where, tenantId };
            args.create = { ...args.create, tenantId };
            args.update = { ...args.update, tenantId };
          }
        }
        return query(args);
      },
    },
    user: {
      $allOperations: ({ operation, args, query }) => {
        const tenantId = getTenantId();
        if (tenantId) {
          if (operation === 'findUnique' || operation === 'findFirst') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'findMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args.data, tenantId };
          } else if (operation === 'update' || operation === 'updateMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'delete' || operation === 'deleteMany') {
            args.where = { ...args.where, tenantId };
          } else if (operation === 'upsert') {
            args.where = { ...args.where, tenantId };
            args.create = { ...args.create, tenantId };
            args.update = { ...args.update, tenantId };
          }
        }
        return query(args);
      },
    },
  },
});

if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

export default prisma;
