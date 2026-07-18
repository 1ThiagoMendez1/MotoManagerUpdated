#!/bin/bash

# Script de despliegue para MotoManager
# Ejecutar como: bash deploy.sh

set -e

echo "🚀 Iniciando despliegue de MotoManager..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes coloreados
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encuentra package.json. Asegúrate de estar en el directorio raíz del proyecto."
    exit 1
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Instálalo primero."
    exit 1
fi

# Verificar npm
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado. Instálalo primero."
    exit 1
fi

print_status "Instalando dependencias..."
npm ci --production=false

print_status "Generando cliente de Prisma..."
npx prisma generate

print_status "Construyendo aplicación..."
npm run build

print_status "Verificando build..."
if [ ! -d ".next" ]; then
    print_error "El build falló. Revisa los errores arriba."
    exit 1
fi

print_status "Creando directorio de logs..."
mkdir -p logs

print_status "Despliegue completado exitosamente! 🎉"
print_warning "Recuerda:"
echo "  1. Configurar las variables de entorno en .env.production"
echo "  2. Configurar la base de datos PostgreSQL"
echo "  3. Ejecutar las migraciones de Prisma"
echo "  4. Configurar Nginx (copia nginx.conf a /etc/nginx/sites-available/)"
echo "  5. Obtener certificado SSL con Let's Encrypt"
echo "  6. Iniciar la aplicación con PM2: pm2 start ecosystem.config.js"
echo ""
print_status "Comandos para iniciar la aplicación:"
echo "  pm2 start ecosystem.config.js"
echo "  pm2 save"
echo "  pm2 startup"
echo ""
print_status "Comandos para monitorear:"
echo "  pm2 logs motomanager"
echo "  pm2 monit"