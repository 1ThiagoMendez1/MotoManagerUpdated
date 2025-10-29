-- Insert default tenant
INSERT INTO "Tenant" ("id", "name", "domain", "email", "phone", "createdAt", "updatedAt")
VALUES ('default-tenant', 'MotoManager Demo', 'demo.motomanager.com', 'admin@demo.motomanager.com', '555-0000', NOW(), NOW());