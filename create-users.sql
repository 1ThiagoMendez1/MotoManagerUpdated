-- Insert default tenant
INSERT INTO "Tenant" ("id", "name", "domain", "email", "phone", "createdAt", "updatedAt")
VALUES ('default-tenant', 'MotoManager Demo', 'demo.motomanager.com', 'admin@demo.motomanager.com', '555-0000', NOW(), NOW());

-- Insert admin user
INSERT INTO "User" ("id", "tenantId", "email", "password", "name", "role", "createdAt", "updatedAt")
VALUES ('1', 'default-tenant', 'admin@demo.motomanager.com', '$2b$10$gN6obGCSYr3XfSz2IJx6Se4nECc6q8tevW8cQFkZB3NkNob8npeK6', 'Admin User', 'admin', NOW(), NOW());

-- Insert regular user
INSERT INTO "User" ("id", "tenantId", "email", "password", "name", "role", "createdAt", "updatedAt")
VALUES ('2', 'default-tenant', 'user@demo.motomanager.com', '$2b$10$gN6obGCSYr3XfSz2IJx6Se4nECc6q8tevW8cQFkZB3NkNob8npeK6', 'Regular User', 'user', NOW(), NOW());