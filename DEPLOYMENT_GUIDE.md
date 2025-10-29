# 🚀 Guía de Despliegue - MotoManager

## 📋 Requisitos del Servidor

### Sistema Operativo
- Ubuntu 20.04 LTS o superior
- Debian 11 o superior

### Especificaciones Mínimas
- **RAM**: 2GB
- **CPU**: 1 vCPU
- **Disco**: 20GB SSD
- **Red**: Conexión estable a internet

### Software Requerido
- Node.js 18.x o superior
- PostgreSQL 13 o superior
- Nginx
- PM2
- Git
- Certbot (para SSL)

## 🛠️ Instalación del Servidor

### 1. Actualizar el sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Instalar PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4. Instalar Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Instalar PM2
```bash
sudo npm install -g pm2
```

### 6. Instalar Git
```bash
sudo apt install git -y
```

### 7. Instalar Certbot (SSL)
```bash
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

## 🗄️ Configuración de Base de Datos

### 1. Crear usuario y base de datos
```bash
sudo -u postgres psql
```

```sql
CREATE USER motomanager_user WITH PASSWORD 'tu_password_seguro';
CREATE DATABASE motomanager_prod OWNER motomanager_user;
GRANT ALL PRIVILEGES ON DATABASE motomanager_prod TO motomanager_user;
\q
```

### 2. Configurar PostgreSQL para conexiones remotas (opcional)
```bash
sudo nano /etc/postgresql/13/main/pg_hba.conf
```
Agregar al final:
```
host    motomanager_prod    motomanager_user    0.0.0.0/0    md5
```

```bash
sudo nano /etc/postgresql/13/main/postgresql.conf
```
Cambiar:
```
listen_addresses = '*'
```

```bash
sudo systemctl restart postgresql
```

## 📁 Despliegue de la Aplicación

### 1. Clonar el repositorio
```bash
cd /var/www
sudo mkdir motomanager
sudo chown $USER:$USER motomanager
cd motomanager
git clone https://github.com/tu-usuario/motomanager.git .
```

### 2. Instalar dependencias
```bash
npm ci --production=false
```

### 3. Configurar variables de entorno
```bash
cp .env.production .env.production.local
nano .env.production.local
```

Configurar las variables:
```env
DATABASE_URL="postgresql://motomanager_user:tu_password_seguro@localhost:5432/motomanager_prod?schema=public"
JWT_SECRET="tu_jwt_secret_muy_seguro_para_produccion"
NEXTAUTH_SECRET="tu_nextauth_secret_muy_seguro"
NEXTAUTH_URL="https://tu-dominio.com"
```

### 4. Configurar Prisma
```bash
cp prisma/production-schema.prisma prisma/schema.prisma
npx prisma generate
```

### 5. Ejecutar migraciones
```bash
npx prisma db push
```

### 6. Ejecutar seed (recomendado)
```bash
npx prisma db seed
```

**Nota**: El seed crea automáticamente un usuario administrador con las siguientes credenciales:
- **Email**: admin@motomanager.com
- **Contraseña**: Admin123!

Después del primer inicio de sesión, cambia la contraseña por seguridad.

### 7. Construir la aplicación
```bash
npm run build
```

## 🌐 Configuración de Nginx

### 1. Copiar configuración
```bash
sudo cp nginx.conf /etc/nginx/sites-available/motomanager
sudo nano /etc/nginx/sites-available/motomanager
```

### 2. Configurar dominio
Reemplazar `tu-dominio.com` con tu dominio real.

### 3. Habilitar sitio
```bash
sudo ln -s /etc/nginx/sites-available/motomanager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Configuración SSL

### 1. Obtener certificado Let's Encrypt
```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

### 2. Verificar renovación automática
```bash
sudo certbot renew --dry-run
```

## 🚀 Inicio de la Aplicación

### 1. Iniciar con PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 2. Verificar estado
```bash
pm2 status
pm2 logs motomanager
```

## 📊 Monitoreo y Mantenimiento

### Comandos PM2 útiles
```bash
pm2 restart motomanager     # Reiniciar aplicación
pm2 stop motomanager        # Detener aplicación
pm2 delete motomanager      # Eliminar aplicación
pm2 monit                   # Monitor en tiempo real
pm2 logs motomanager        # Ver logs
```

### Verificar logs de Nginx
```bash
sudo tail -f /var/log/nginx/motomanager_access.log
sudo tail -f /var/log/nginx/motomanager_error.log
```

### Backup de base de datos
```bash
pg_dump -U motomanager_user -h localhost motomanager_prod > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 🔄 Actualizaciones

### 1. Actualizar código
```bash
cd /var/www/motomanager
git pull origin main
npm ci --production=false
npm run build
pm2 restart motomanager
```

### 2. Actualizar base de datos (si hay cambios)
```bash
npx prisma db push
```

## 🆘 Solución de Problemas

### Aplicación no inicia
```bash
pm2 logs motomanager --lines 100
```

### Error de conexión a base de datos
```bash
sudo -u postgres psql -c "SELECT version();"
psql -U motomanager_user -d motomanager_prod -c "SELECT 1;"
```

### Nginx no responde
```bash
sudo nginx -t
sudo systemctl status nginx
sudo systemctl reload nginx
```

### Certificado SSL expirado
```bash
sudo certbot renew
sudo systemctl reload nginx
```

## 📞 Contacto de Soporte

Para soporte técnico:
- Email: soporte@devsystech.com.co
- Sitio web: www.devsystech.com.co

---

**Desarrollado por DevS&STech S.A.S**